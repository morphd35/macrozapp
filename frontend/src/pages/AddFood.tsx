import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../utils/axiosConfig';
import { Food } from '../types';
import './AddFood.css';

type SortOrder = 'az' | 'za';
const todayLocal = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};

const AddFood: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const routeDate = (location.state as { logDate?: string } | null)?.logDate;
  const logDate = routeDate && /^\d{4}-\d{2}-\d{2}$/.test(routeDate) ? routeDate : todayLocal();
  const userId = Number(user?.id);
  const hasLocalAccess = Boolean(user?.isPaid || user?.isPaidOneTime);
  const [foods, setFoods] = useState<Food[]>([]);
  const [query, setQuery] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualServing, setManualServing] = useState('1 serving');
  const [manualMacros, setManualMacros] = useState({ calories: '', protein: '', carbs: '', fats: '' });
  const [sort, setSort] = useState<SortOrder>('az');
  const [selected, setSelected] = useState<Food | null>(null);
  const [servings, setServings] = useState('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!Number.isInteger(userId) || userId <= 0 || !hasLocalAccess) {
      setLoading(false);
      return;
    }
    let active = true;
    axiosInstance.get<Food[]>('/api/food_logs/foods', { params: { user_id: userId } })
      .then(response => { if (active) setFoods(response.data); })
      .catch(() => { if (active) setError('Unable to load your saved foods. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, hasLocalAccess]);

  const visibleFoods = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return foods.filter(food => food.name.toLocaleLowerCase().includes(needle))
      .sort((a, b) => sort === 'az' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  }, [foods, query, sort]);

  const quantity = Number(servings);
  const validQuantity = Number.isFinite(quantity) && quantity > 0 && quantity <= 1000;
  const macro = (name: string) => (selected?.macros || []).find(m => m.macro_name.toLowerCase() === name)?.value || 0;
  const dismissKeyboard = () => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); };

  const submitManual = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!Number.isInteger(userId) || userId <= 0 || !manualName.trim() || !manualServing.trim() || saving) return;
    const values = Object.values(manualMacros);
    if (values.some(value => value.trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0)) {
      setError('Enter valid non-negative values for all four nutrients (use 0 when none).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // The existing schema requires a food record before a diary entry can reference it.
      // This does not grant free users access to the premium saved-food lookup UI.
      const response = await axiosInstance.post<Food>('/api/food_logs/foods', {
        user_id: userId,
        name: manualName.trim(),
        serving_size: manualServing.trim(),
        category: 'Manual',
        macros: Object.entries(manualMacros).map(([macro_name, value]) => ({
          macro_name, value: Number(value), unit: macro_name === 'calories' ? 'kcal' : 'g',
        })),
      });
      await axiosInstance.post('/api/food_logs/food_logs', {
        user_id: userId, food_id: response.data.id, servings: 1, log_date: logDate,
      });
      navigate('/app/dashboard', { replace: true, state: { logDate, foodLogged: true } });
    } catch {
      setError('Unable to save and log this food. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!selected || !validQuantity || saving) return;
    setSaving(true);
    setError('');
    dismissKeyboard();
    try {
      await axiosInstance.post('/api/food_logs/food_logs', {
        user_id: userId, food_id: selected.id, servings: quantity, log_date: logDate,
      });
      navigate('/app/dashboard', { replace: true, state: { logDate, foodLogged: true } });
    } catch {
      setError('Food could not be logged. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="add-food-page">
      <header className="add-food-header">
        <button type="button" className="add-food-back" onClick={() => selected ? setSelected(null) : navigate('/app/dashboard', { state: { logDate } })} aria-label="Go back">← Back</button>
        <h1>{selected ? 'Log servings' : 'Add Food'}</h1>
        <p>Logging for {logDate}</p>
      </header>
      {selected ? (
        <div className="add-food-panel">
          <h2>{selected.name}</h2>
          <p>One serving: {selected.serving_size}</p>
          <label htmlFor="add-food-servings">Number of servings</label>
          <input id="add-food-servings" type="number" inputMode="decimal" min="0.1" max="1000" step="0.1" value={servings} onChange={e => setServings(e.target.value)} />
          <div className="add-food-macros" aria-live="polite">
            <span>{(macro('calories') * (validQuantity ? quantity : 0)).toFixed(0)} cal</span>
            <span>{(macro('protein') * (validQuantity ? quantity : 0)).toFixed(1)}g protein</span>
            <span>{(macro('carbs') * (validQuantity ? quantity : 0)).toFixed(1)}g carbs</span>
            <span>{(macro('fats') * (validQuantity ? quantity : 0)).toFixed(1)}g fat</span>
          </div>
          {error && <p role="alert" className="add-food-error">{error}</p>}
          <div className="add-food-actions">
            <button type="button" className="add-food-primary" disabled={!validQuantity || saving} onClick={submit}>{saving ? 'Logging…' : 'Log Food'}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="add-food-panel">
            <h2>Enter Food Manually</h2>
            <p>Available on every plan. Enter the nutrition for one serving to add it to your diary.</p>
            <form onSubmit={submitManual} className="add-food-manual-form">
              <label htmlFor="manual-name">Food name</label>
              <input id="manual-name" required maxLength={150} value={manualName} onChange={e => setManualName(e.target.value)} placeholder="e.g. Scrambled eggs" />
              <label htmlFor="manual-serving">Serving size</label>
              <input id="manual-serving" required value={manualServing} onChange={e => setManualServing(e.target.value)} placeholder="e.g. 2 eggs" />
              {(['calories', 'protein', 'carbs', 'fats'] as const).map(name => (
                <React.Fragment key={name}>
                  <label htmlFor={`manual-${name}`}>{name.charAt(0).toUpperCase() + name.slice(1)} ({name === 'calories' ? 'kcal' : 'g'})</label>
                  <input id={`manual-${name}`} type="number" inputMode="decimal" min="0" step="any" required value={manualMacros[name]} onChange={e => setManualMacros(prev => ({ ...prev, [name]: e.target.value }))} />
                </React.Fragment>
              ))}
              {error && <p role="alert" className="add-food-error">{error}</p>}
              <button type="submit" className="add-food-primary" disabled={saving}>{saving ? 'Logging…' : 'Save to Diary'}</button>
            </form>
          </div>
          {hasLocalAccess ? <div className="add-food-panel">
            <h2>My Foods</h2>
            <label htmlFor="add-food-search">Search saved foods</label>
            <input ref={searchRef} id="add-food-search" type="search" enterKeyHint="done" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') dismissKeyboard(); }} placeholder="Search your foods…" />
            <label htmlFor="add-food-sort">Sort</label>
            <select id="add-food-sort" value={sort} onChange={e => setSort(e.target.value as SortOrder)}>
              <option value="az">Name: A–Z</option>
              <option value="za">Name: Z–A</option>
            </select>
            {loading ? <p>Loading saved foods…</p> : error ? <p role="alert" className="add-food-error">{error}</p> : visibleFoods.length === 0 ? <p>{query ? 'No saved foods match your search.' : 'No saved foods yet.'}</p> : (
              <ul className="add-food-list">
                {visibleFoods.map(food => (
                  <li key={food.id}>
                    <button type="button" onClick={() => { dismissKeyboard(); setSelected(food); setServings('1'); setError(''); }}>
                      <span><strong>{food.name}</strong><small>{food.serving_size}</small></span>
                      <span>{(food.macros.find(m => m.macro_name.toLowerCase() === 'calories')?.value || 0).toFixed(0)} cal <span aria-hidden="true">›</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div> : <div className="add-food-panel add-food-secondary"><p>Reuse saved foods with a subscription or one-time purchase.</p><button type="button" onClick={() => navigate('/payment-onetime')}>View access options</button></div>}
          {hasLocalAccess && <div className="add-food-panel add-food-secondary">
            <p>Need a food that isn't saved yet?</p>
            <button type="button" onClick={() => navigate('/app/food-maintenance')}>Manage or add saved foods</button>
            {user?.isPaid && <p>Edamam lookup remains available in the existing dashboard flow while we migrate it.</p>}
          </div>}
        </>
      )}
    </section>
  );
};

export default AddFood;
