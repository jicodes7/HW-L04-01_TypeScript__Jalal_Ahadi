import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import "./index.css";
import App from "./App";
import { store } from "./store";
import { PreferencesProvider } from "./PreferencesContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </Provider>
  </React.StrictMode>
);
