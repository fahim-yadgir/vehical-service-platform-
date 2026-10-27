"use client";

import { useEffect, useState } from "react";
import { loadProfile } from "./customerProfile";
import { restoreOrders, useOrders } from "./orders";
import { restoreStaff, restoreTenants } from "./redux-store";

/** The signed-in customer's own orders (matched by mobile number until the backend has customer ids). */
export function useCustomerOrders() {
  const all = useOrders();
  const [mobile, setMobile] = useState<string | null>(null);

  useEffect(() => {
    restoreTenants();
    restoreStaff();
    restoreOrders();
    setMobile(loadProfile().mobile);
  }, []);

  return { mobile, orders: mobile ? all.filter((o) => o.customer.mobile === mobile) : [] };
}