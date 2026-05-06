"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Phone,
  MapPin,
  Building2,
  Search,
} from "lucide-react";

import { FactoryShell } from "@/components/factory/factory-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-field";
import { apiFetch, apiPost } from "@/lib/api";

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  type: string;
  phone: string | null;
  city: string | null;
  credit_limit_npr: number | null;
  is_active: boolean;
}

interface SalesOrder {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  order_date: string;
  total_npr: number;
  item_count: number;
  requested_delivery_date: string | null;
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-300",
  confirmed: "bg-blue-500/20 text-blue-300",
  partially_dispatched: "bg-indigo-500/20 text-indigo-300",
  dispatched: "bg-emerald-500/20 text-emerald-300",
  delivered: "bg-green-500/20 text-green-300",
  cancelled: "bg-red-500/20 text-red-300",
};

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"orders" | "customers">("orders");
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [search, setSearch] = useState("");

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["sales-orders"],
    queryFn: () => apiFetch<SalesOrder[]>("/sales/orders"),
  });

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<Customer[]>("/sales/customers"),
  });

  const { data: pendingSummary } = useQuery({
    queryKey: ["sales-pending"],
    queryFn: () => apiFetch<{ pending_count: number; total_pending_npr: number }>("/sales/orders/pending-summary"),
  });

  const isLoading = tab === "orders" ? ordersLoading : customersLoading;

  if (isLoading) {
    return (
      <FactoryShell eyebrow="Sales" title="Orders & Customers">
        <LoadingSkeleton />
      </FactoryShell>
    );
  }

  return (
    <FactoryShell
      eyebrow="Sales"
      title="Orders & Customers"
      actions={
        <div className="flex gap-2">
          {tab === "customers" ? (
            <Button size="sm" onClick={() => setShowCreateCustomer(true)}>
              <Plus className="h-4 w-4 mr-1" /> Customer
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowCreateOrder(true)}>
              <Plus className="h-4 w-4 mr-1" /> Order
            </Button>
          )}
        </div>
      }
    >
      {/* Summary Cards */}
      {pendingSummary && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <GlassCard className="p-3 text-center">
            <p className="text-2xl font-bold text-white">{pendingSummary.pending_count}</p>
            <p className="text-xs text-zinc-400">Pending Orders</p>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              रू {pendingSummary.total_pending_npr?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-zinc-400">Pending Value</p>
          </GlassCard>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-white/5 rounded-lg w-fit">
        {(["orders", "customers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t === "orders" ? "Orders" : "Customers"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder={`Search ${tab}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>

      {/* Orders Tab */}
      {tab === "orders" && (
        <>
          {!orders || orders.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-10 w-10" />}
              title="No sales orders"
              description="Create your first order to start tracking sales"
            />
          ) : (
            <div className="space-y-3">
              {orders
                .filter(
                  (o) =>
                    !search ||
                    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
                    o.customer_name.toLowerCase().includes(search.toLowerCase())
                )
                .map((order) => (
                  <GlassCard key={order.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-white">
                            {order.order_number}
                          </span>
                          <Badge className={ORDER_STATUS_COLORS[order.status] || ""}>
                            {order.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-400 mt-0.5">{order.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          रू {order.total_npr.toLocaleString()}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {order.item_count} item{order.item_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
            </div>
          )}
        </>
      )}

      {/* Customers Tab */}
      {tab === "customers" && (
        <>
          {!customers || customers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="No customers"
              description="Add your first customer to get started"
            />
          ) : (
            <div className="space-y-3">
              {customers
                .filter(
                  (c) =>
                    !search ||
                    c.name.toLowerCase().includes(search.toLowerCase()) ||
                    c.customer_code.toLowerCase().includes(search.toLowerCase())
                )
                .map((cust) => (
                  <GlassCard key={cust.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{cust.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                          <span className="font-mono">{cust.customer_code}</span>
                          <Badge className="bg-white/5 text-zinc-300 text-[10px]">
                            {cust.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right text-xs text-zinc-500">
                        {cust.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {cust.phone}
                          </div>
                        )}
                        {cust.city && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {cust.city}
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
            </div>
          )}
        </>
      )}

      {/* Create Customer Sheet */}
      <BottomSheet
        open={showCreateCustomer}
        onClose={() => setShowCreateCustomer(false)}
        title="Add Customer"
      >
        <CreateCustomerForm
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            setShowCreateCustomer(false);
          }}
        />
      </BottomSheet>

      {/* Create Order Sheet */}
      <BottomSheet
        open={showCreateOrder}
        onClose={() => setShowCreateOrder(false)}
        title="New Sales Order"
      >
        <CreateOrderForm
          customers={customers || []}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
            queryClient.invalidateQueries({ queryKey: ["sales-pending"] });
            setShowCreateOrder(false);
          }}
        />
      </BottomSheet>
    </FactoryShell>
  );
}

function CreateCustomerForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("wholesale");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (data: object) => apiPost("/sales/customers", data),
    onSuccess,
  });

  return (
    <div className="space-y-3 p-4">
      <FormInput label="Name" value={name} onChange={(val) => setName(val)} required />
      <FormSelect
        label="Type"
        value={type}
        onChange={(val) => setType(val)}
        options={[
          { value: "wholesale", label: "Wholesale" },
          { value: "retail", label: "Retail" },
          { value: "agent", label: "Agent" },
        ]}
      />
      <FormInput label="Phone" value={phone} onChange={(val) => setPhone(val)} />
      <FormInput label="City" value={city} onChange={(val) => setCity(val)} />
      <FormTextarea label="Notes" value={notes} onChange={(val) => setNotes(val)} />
      <Button
        className="w-full"
        onClick={() => mutation.mutate({ name, type, phone: phone || undefined, city: city || undefined, notes: notes || undefined })}
        disabled={!name}
      >
        Add Customer
      </Button>
    </div>
  );
}

function CreateOrderForm({
  customers,
  onSuccess,
}: {
  customers: Customer[];
  onSuccess: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [items, setItems] = useState([{ style_id: "", quantity_ordered: "", unit_price_npr: "" }]);

  const { data: styles } = useQuery({
    queryKey: ["styles-for-order"],
    queryFn: () => apiFetch<{ id: string; style_code: string; name: string }[]>("/styles"),
  });

  const mutation = useMutation({
    mutationFn: (data: object) => apiPost("/sales/orders", data),
    onSuccess,
  });

  const addItem = () =>
    setItems([...items, { style_id: "", quantity_ordered: "", unit_price_npr: "" }]);

  const updateItem = (idx: number, field: string, value: string) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  return (
    <div className="space-y-4 p-4">
      <FormSelect
        label="Customer"
        value={customerId}
        onChange={(val) => setCustomerId(val)}
        options={[
          { value: "", label: "Select customer..." },
          ...customers.map((c) => ({ value: c.id, label: `${c.customer_code} - ${c.name}` })),
        ]}
      />
      <FormInput
        label="Requested Delivery"
        type="date"
        value={deliveryDate}
        onChange={(val) => setDeliveryDate(val)}
      />

      <div className="border-t border-white/10 pt-3">
        <p className="text-sm font-medium text-zinc-300 mb-2">Items</p>
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
            <FormSelect
              label="Style"
              value={item.style_id}
              onChange={(val) => updateItem(idx, "style_id", val)}
              options={[
                { value: "", label: "Select..." },
                ...(styles?.map((s) => ({ value: s.id, label: s.style_code })) || []),
              ]}
            />
            <FormInput
              label="Qty"
              type="number"
              value={item.quantity_ordered}
              onChange={(val) => updateItem(idx, "quantity_ordered", val)}
            />
            <FormInput
              label="Price"
              type="number"
              value={item.unit_price_npr}
              onChange={(val) => updateItem(idx, "unit_price_npr", val)}
            />
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addItem} className="text-xs">
          + Add item
        </Button>
      </div>

      <Button
        className="w-full"
        onClick={() =>
          mutation.mutate({
            customer_id: customerId,
            requested_delivery_date: deliveryDate || undefined,
            items: items
              .filter((i) => i.style_id && i.quantity_ordered)
              .map((i) => ({
                style_id: i.style_id,
                quantity_ordered: Number(i.quantity_ordered),
                unit_price_npr: Number(i.unit_price_npr) || 0,
              })),
          })
        }
        disabled={!customerId || items.every((i) => !i.style_id)}
      >
        Create Order
      </Button>
    </div>
  );
}
