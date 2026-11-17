const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export const formatPrice = (n: number) => inr.format(n);
