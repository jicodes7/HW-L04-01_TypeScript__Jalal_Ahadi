import { FormEvent, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import {
  ResponsiveContainer, PieChart, Pie, Tooltip, Legend,
  LineChart, Line, CartesianGrid, XAxis, YAxis
} from "recharts";
import type { RootState, AppDispatch } from "./store";
import {
  addTransaction, deleteTransaction, addCategory, addWallet,
  addReminder, transferMoney, importTransactions
} from "./store";
import { usePreferences } from "./PreferencesContext";
import type { Transaction, TransactionType } from "./types";

const money = (n: number) => new Intl.NumberFormat("fa-IR").format(n);

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const finance = useSelector((s: RootState) => s.finance);
  const { currency, setCurrency } = usePreferences();

  const [form, setForm] = useState({
    title: "",
    amount: "",
    type: "expense" as TransactionType,
    date: new Date().toISOString().slice(0, 10),
    category: finance.categories[0],
    walletId: finance.wallets[0]?.id ?? ""
  });

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [walletName, setWalletName] = useState("");
  const [walletBalance, setWalletBalance] = useState("");
  const [transfer, setTransfer] = useState({
    fromWalletId: finance.wallets[0]?.id ?? "",
    toWalletId: finance.wallets[1]?.id ?? finance.wallets[0]?.id ?? "",
    amount: ""
  });
  const [reminder, setReminder] = useState({ title: "", dueDate: "", repeat: "monthly" as "weekly" | "monthly" });

  const income = finance.transactions.filter(t => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const expense = finance.transactions.filter(t => t.type === "expense").reduce((a, b) => a + b.amount, 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return finance.transactions.filter(t => {
      const qOk = !q || t.title.toLowerCase().includes(q) || String(t.amount).includes(q);
      const catOk = filterCategory === "all" || t.category === filterCategory;
      const fromOk = !fromDate || t.date >= fromDate;
      const toOk = !toDate || t.date <= toDate;
      return qOk && catOk && fromOk && toOk;
    });
  }, [finance.transactions, search, filterCategory, fromDate, toDate]);

  const walletBalances = useMemo(() => {
    return finance.wallets.map(w => {
      const movement = finance.transactions
        .filter(t => t.walletId === w.id)
        .reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
      return { ...w, balance: w.openingBalance + movement };
    });
  }, [finance.wallets, finance.transactions]);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    finance.transactions.filter(t => t.type === "expense").forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [finance.transactions]);

  const lineData = useMemo(() => {
    const map: Record<string, { date: string; income: number; expense: number }> = {};
    [...finance.transactions].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
      map[t.date] ??= { date: t.date, income: 0, expense: 0 };
      map[t.date][t.type] += t.amount;
    });
    return Object.values(map);
  }, [finance.transactions]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || amount <= 0) return;
    dispatch(addTransaction({ ...form, title: form.title.trim(), amount }));
    setForm(v => ({ ...v, title: "", amount: "" }));
  }

  function exportCSV() {
    const rows = [
      ["id", "title", "amount", "type", "date", "category", "walletId"],
      ...finance.transactions.map(t => [t.id, t.title, t.amount, t.type, t.date, t.category, t.walletId])
    ];
    download("transactions.csv", rows.map(r => r.join(",")).join("\n"), "text/csv;charset=utf-8");
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.text("Expense Tracker Report", 20, 20);
    finance.transactions.slice(0, 30).forEach((t, i) => {
      doc.text(`${i + 1}. ${t.title} - ${t.amount} - ${t.date}`, 20, 32 + i * 6);
    });
    doc.save("expense-report.pdf");
  }

  function exportJSON() {
    download("transactions.json", JSON.stringify(finance.transactions, null, 2), "application/json");
  }

  function importJSON(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const value = JSON.parse(String(reader.result)) as Transaction[];
        if (!Array.isArray(value)) throw new Error();
        dispatch(importTransactions(value));
      } catch {
        alert("فایل JSON معتبر نیست.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-3 rounded-3xl bg-slate-950 p-6 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold text-violet-300">TypeScript + Redux Toolkit + Context API</p>
            <h1 className="mt-1 text-3xl font-black">Expense Tracker</h1>
          </div>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value as "تومان" | "ریال")}
            className="rounded-xl bg-white/10 px-3 py-2"
          >
            <option className="text-slate-900">تومان</option>
            <option className="text-slate-900">ریال</option>
          </select>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["درآمد", income, "text-emerald-600"],
            ["هزینه", expense, "text-rose-600"],
            ["تراز", income - expense, "text-violet-600"]
          ].map(([label, value, cls]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <strong className={`mt-2 block text-2xl ${cls}`}>{money(Number(value))} {currency}</strong>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">ثبت تراکنش</h2>
          <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="عنوان" className="rounded-xl border border-slate-300 px-3 py-3" />
            <input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} type="number" min="0" placeholder="مبلغ" className="rounded-xl border border-slate-300 px-3 py-3" />
            <input value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} type="date" className="rounded-xl border border-slate-300 px-3 py-3" />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as TransactionType })} className="rounded-xl border border-slate-300 px-3 py-3">
              <option value="expense">هزینه</option><option value="income">درآمد</option>
            </select>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-3">
              {finance.categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={form.walletId} onChange={e => setForm({ ...form, walletId: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-3">
              {finance.wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <button className="rounded-xl bg-violet-600 px-4 py-3 font-bold text-white md:col-span-2 xl:col-span-3">ثبت تراکنش</button>
          </form>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-black">هزینه بر اساس دسته‌بندی</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={pieData} dataKey="value" nameKey="name" outerRadius={95} fill="#7c3aed" label /><Tooltip /><Legend /></PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-black">روند درآمد و هزینه</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">جستجو و فیلتر</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="عنوان یا مبلغ" className="rounded-lg border border-slate-300 px-3 py-2" />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="all">همه دسته‌ها</option>
              {finance.categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
          </div>

          <div className="mt-4 space-y-2">
            {filtered.map(t => (
              <article key={t.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong>{t.title}</strong>
                  <p className="mt-1 text-xs text-slate-500">{t.category} · {t.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <strong className={t.type === "income" ? "text-emerald-600" : "text-rose-600"}>
                    {t.type === "income" ? "+" : "-"} {money(t.amount)} {currency}
                  </strong>
                  <button onClick={() => dispatch(deleteTransaction(t.id))} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">حذف</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black">کیف پول‌ها</h2>
            <div className="mt-3 space-y-2">
              {walletBalances.map(w => (
                <div key={w.id} className="flex justify-between rounded-xl bg-slate-50 p-3">
                  <span>{w.name}</span><strong>{money(w.balance)} {currency}</strong>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input value={walletName} onChange={e => setWalletName(e.target.value)} placeholder="نام حساب" className="rounded-lg border border-slate-300 px-3 py-2" />
              <input value={walletBalance} onChange={e => setWalletBalance(e.target.value)} type="number" placeholder="موجودی اولیه" className="rounded-lg border border-slate-300 px-3 py-2" />
              <button onClick={() => {
                if (!walletName.trim()) return;
                dispatch(addWallet({ name: walletName.trim(), openingBalance: Number(walletBalance) || 0 }));
                setWalletName(""); setWalletBalance("");
              }} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white">افزودن</button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black">انتقال بین حساب‌ها</h2>
            <div className="mt-3 grid gap-2">
              <select value={transfer.fromWalletId} onChange={e => setTransfer({ ...transfer, fromWalletId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2">
                {finance.wallets.map(w => <option key={w.id} value={w.id}>از: {w.name}</option>)}
              </select>
              <select value={transfer.toWalletId} onChange={e => setTransfer({ ...transfer, toWalletId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2">
                {finance.wallets.map(w => <option key={w.id} value={w.id}>به: {w.name}</option>)}
              </select>
              <input value={transfer.amount} onChange={e => setTransfer({ ...transfer, amount: e.target.value })} type="number" placeholder="مبلغ" className="rounded-lg border border-slate-300 px-3 py-2" />
              <button onClick={() => {
                dispatch(transferMoney({ ...transfer, amount: Number(transfer.amount) }));
                setTransfer({ ...transfer, amount: "" });
              }} className="rounded-lg bg-violet-600 px-4 py-2 font-bold text-white">انتقال</button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black">دسته‌بندی سفارشی</h2>
            <div className="mt-3 flex gap-2">
              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="نام دسته" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2" />
              <button onClick={() => { dispatch(addCategory(newCategory)); setNewCategory(""); }} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white">افزودن</button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black">یادآوری هزینه دوره‌ای</h2>
            <div className="mt-3 grid gap-2">
              <input value={reminder.title} onChange={e => setReminder({ ...reminder, title: e.target.value })} placeholder="عنوان" className="rounded-lg border border-slate-300 px-3 py-2" />
              <input value={reminder.dueDate} onChange={e => setReminder({ ...reminder, dueDate: e.target.value })} type="date" className="rounded-lg border border-slate-300 px-3 py-2" />
              <select value={reminder.repeat} onChange={e => setReminder({ ...reminder, repeat: e.target.value as "weekly" | "monthly" })} className="rounded-lg border border-slate-300 px-3 py-2">
                <option value="weekly">هفتگی</option><option value="monthly">ماهانه</option>
              </select>
              <button onClick={() => {
                if (reminder.title && reminder.dueDate) dispatch(addReminder(reminder));
              }} className="rounded-lg bg-violet-600 px-4 py-2 font-bold text-white">ثبت یادآور</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">تعداد یادآورها: {finance.reminders.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black">Import / Export</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={exportCSV} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">CSV</button>
              <button onClick={exportPDF} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white">PDF</button>
              <button onClick={exportJSON} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">JSON</button>
              <label className="cursor-pointer rounded-lg bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700">
                Import
                <input type="file" accept=".json" onChange={e => importJSON(e.target.files?.[0])} className="hidden" />
              </label>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
