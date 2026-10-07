import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { FinanceState, Reminder, Transaction, Wallet } from "./types";

const STORAGE_KEY = "hw-l04-01-finance";

const seed: FinanceState = {
  categories: ["غذا", "حمل‌ونقل", "قبوض", "تفریح", "حقوق", "خرید"],
  wallets: [
    { id: "bank", name: "حساب بانکی", openingBalance: 12_000_000 },
    { id: "cash", name: "کیف پول نقدی", openingBalance: 1_500_000 }
  ],
  transactions: [
    { id: "1", title: "حقوق", amount: 18_000_000, type: "income", date: "2026-10-01", category: "حقوق", walletId: "bank" },
    { id: "2", title: "خرید روزانه", amount: 850_000, type: "expense", date: "2026-10-02", category: "خرید", walletId: "bank" },
    { id: "3", title: "اینترنت", amount: 420_000, type: "expense", date: "2026-10-03", category: "قبوض", walletId: "cash" }
  ],
  reminders: []
};

const saved = localStorage.getItem(STORAGE_KEY);
const initialState: FinanceState = saved ? JSON.parse(saved) : seed;

const financeSlice = createSlice({
  name: "finance",
  initialState,
  reducers: {
    addTransaction(state, action: PayloadAction<Omit<Transaction, "id">>) {
      state.transactions.unshift({ ...action.payload, id: crypto.randomUUID() });
    },
    deleteTransaction(state, action: PayloadAction<string>) {
      state.transactions = state.transactions.filter(t => t.id !== action.payload);
    },
    addCategory(state, action: PayloadAction<string>) {
      const value = action.payload.trim();
      if (value && !state.categories.includes(value)) state.categories.push(value);
    },
    addWallet(state, action: PayloadAction<Omit<Wallet, "id">>) {
      state.wallets.push({ ...action.payload, id: crypto.randomUUID() });
    },
    addReminder(state, action: PayloadAction<Omit<Reminder, "id">>) {
      state.reminders.unshift({ ...action.payload, id: crypto.randomUUID() });
    },
    transferMoney(
      state,
      action: PayloadAction<{ fromWalletId: string; toWalletId: string; amount: number }>
    ) {
      const { fromWalletId, toWalletId, amount } = action.payload;
      if (fromWalletId === toWalletId || amount <= 0) return;
      const date = new Date().toISOString().slice(0, 10);
      state.transactions.unshift(
        { id: crypto.randomUUID(), title: "انتقال بین حساب‌ها", amount, type: "expense", date, category: "انتقال", walletId: fromWalletId },
        { id: crypto.randomUUID(), title: "دریافت انتقال", amount, type: "income", date, category: "انتقال", walletId: toWalletId }
      );
    },
    importTransactions(state, action: PayloadAction<Transaction[]>) {
      state.transactions = action.payload;
    }
  }
});

export const {
  addTransaction, deleteTransaction, addCategory, addWallet,
  addReminder, transferMoney, importTransactions
} = financeSlice.actions;

export const store = configureStore({ reducer: { finance: financeSlice.reducer } });

store.subscribe(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store.getState().finance));
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
