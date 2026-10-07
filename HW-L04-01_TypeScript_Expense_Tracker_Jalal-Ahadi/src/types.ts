export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  date: string;
  category: string;
  walletId: string;
};

export type Wallet = {
  id: string;
  name: string;
  openingBalance: number;
};

export type Reminder = {
  id: string;
  title: string;
  dueDate: string;
  repeat: "weekly" | "monthly";
};

export type FinanceState = {
  transactions: Transaction[];
  categories: string[];
  wallets: Wallet[];
  reminders: Reminder[];
};
