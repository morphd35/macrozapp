export const getUserStatus = (): 'free' | 'onetime' | 'subscribed' => {
    const isPaid = localStorage.getItem('is_paid') === 'true';
    const isPaidOnetime = localStorage.getItem('is_paid_onetime') === 'true';
    if (isPaid) return 'subscribed';
    if (isPaidOnetime) return 'onetime';
    return 'free';
};