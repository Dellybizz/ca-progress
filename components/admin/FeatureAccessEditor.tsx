"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Save, Search, ShieldCheck } from "lucide-react";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;
const featureV2Styles = `.plan-select{display:grid!important;grid-template-columns:1fr!important;gap:4px!important;min-width:220px}.plan-select>span{font-size:8px!important;color:#c7d7f2!important}.plan-select select{width:100%!important;background:#fff!important;color:#172b4d!important;border:2px solid #8fb5f5!important;font-weight:800!important;appearance:auto!important}.plan-select option{background:#fff!important;color:#172b4d!important}.feature-controls{grid-template-columns:repeat(3,minmax(125px,1fr)) auto!important;align-content:start}.feature-controls .upgrade-copy{grid-column:1/-2}.feature-controls>button{grid-column:-2/-1}.feature-copy code{word-break:break-all}@media(max-width:1050px){.feature-controls{grid-template-columns:repeat(2,minmax(130px,1fr))!important}.feature-controls .upgrade-copy,.feature-controls>button{grid-column:1/-1}.feature-controls>button{justify-content:center}}@media(max-width:650px){.plan-select{min-width:0}.feature-controls{grid-template-columns:1fr!important}}`;
type Plan = { id: string; slug: string; name: string; rank: number };
type Feature = {
  feature_key: string;
  page_key: string;
  section_key: string | null;
  parent_feature_key: string | null;
  label: string;
  description: string;
  meter_type: "boolean" | "minutes" | "megabytes" | "count";
  enabled: boolean;
  sort_order: number;
};
type Rule = {
  id: string;
  plan_id: string;
  feature_key: string;
  enabled: boolean;
  limit_value: number | null;
  limit_unit: "unlimited" | "minutes" | "megabytes" | "count";
  reset_period: "never" | "daily" | "weekly" | "monthly";
  upgrade_message: string;
  config: Record<string, unknown>;
};
export default function FeatureAccessEditor() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [planId, setPlanId] = useState("");
  const [page, setPage] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const load = async () => {
    if (!supabase) return;
    const [p, f, r] = await Promise.all([
      supabase
        .from("subscription_plans")
        .select("id,slug,name,rank")
        .order("rank"),
      supabase.from("app_features").select("*").order("sort_order"),
      supabase.from("plan_feature_limits").select("*"),
    ]);
    setPlans((p.data || []) as Plan[]);
    setFeatures((f.data || []) as Feature[]);
    setRules((r.data || []) as Rule[]);
    if (!planId && p.data?.[0]) setPlanId(p.data[0].id);
  };
  useEffect(() => {
    void load();
  }, []);
  const pages = Array.from(new Set(features.map((item) => item.page_key)));
  const visible = useMemo(
    () =>
      features.filter(
        (item) =>
          (page === "all" || item.page_key === page) &&
          `${item.label} ${item.feature_key}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [features, page, search],
  );
  const ruleFor = (key: string) =>
    rules.find((item) => item.plan_id === planId && item.feature_key === key);
  const update = (featureKey: string, patch: Partial<Rule>) =>
    setRules((all) =>
      all.map((item) =>
        item.plan_id === planId && item.feature_key === featureKey
          ? { ...item, ...patch }
          : item,
      ),
    );
  const save = async (feature: Feature) => {
    if (!supabase) return;
    const rule = ruleFor(feature.feature_key);
    if (!rule) return;
    const { error } = await supabase
      .from("plan_feature_limits")
      .update({ ...rule, updated_at: new Date().toISOString() })
      .eq("id", rule.id);
    setNotice(error ? error.message : `${feature.label} saved`);
    window.setTimeout(() => setNotice(""), 2200);
  };
  return (
    <section className="access-editor">
      <header>
        <div>
          <ShieldCheck />
          <span>
            <h2>Feature access and allowances</h2>
            <p>
              Choose exactly what each subscription can use and how much is
              included.
            </p>
          </span>
        </div>
        <label className="plan-select">
          <span>Editing plan</span>
          <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((plan) => (
              <option value={plan.id} key={plan.id}>
                {plan.name} plan
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="access-toolbar">
        <label>
          <Search />
          <input
            placeholder="Search features"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select value={page} onChange={(e) => setPage(e.target.value)}>
          <option value="all">Every page</option>
          {pages.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="access-list">
        {visible.map((feature) => {
          const rule = ruleFor(feature.feature_key);
          if (!rule) return null;
          const accessMode = !rule.enabled
            ? "locked"
            : rule.limit_unit === "unlimited"
              ? "unlimited"
              : "limited";
          const unitLabel =
            feature.meter_type === "megabytes"
              ? "Storage (MB)"
              : feature.meter_type === "minutes"
                ? "Minutes included"
                : "Number included";
          return (
            <article key={feature.feature_key}>
              <div className="feature-copy">
                <span>
                  {feature.page_key}
                  {feature.section_key ? ` / ${feature.section_key}` : ""}
                </span>
                <h3>{feature.label}</h3>
                <p>{feature.description}</p>
                <code>{feature.feature_key}</code>
              </div>
              <div className="feature-controls">
                <label>
                  Access for this plan
                  <select
                    value={accessMode}
                    onChange={(e) =>
                      update(feature.feature_key, {
                        enabled: e.target.value !== "locked",
                        limit_unit:
                          e.target.value === "limited"
                            ? feature.meter_type === "boolean"
                              ? "count"
                              : feature.meter_type
                            : "unlimited",
                        limit_value:
                          e.target.value === "unlimited"
                            ? null
                            : rule.limit_value || 1,
                      })
                    }
                  >
                    <option value="locked">Locked</option>
                    <option value="unlimited">Included · unlimited</option>
                    {feature.meter_type !== "boolean" && (
                      <option value="limited">Included · limited</option>
                    )}
                  </select>
                </label>
                {accessMode === "limited" && (
                  <label>
                    {unitLabel}
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={rule.limit_value ?? 0}
                      onChange={(e) =>
                        update(feature.feature_key, {
                          limit_value: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                )}
                {accessMode === "limited" && (
                  <label>
                    Allowance resets
                    <select
                      value={rule.reset_period}
                      onChange={(e) =>
                        update(feature.feature_key, {
                          reset_period: e.target.value as Rule["reset_period"],
                        })
                      }
                    >
                      <option value="never">Never</option>
                      <option value="daily">Every day</option>
                      <option value="weekly">Every week</option>
                      <option value="monthly">Every month</option>
                    </select>
                  </label>
                )}
                {accessMode === "limited" && (
                  <label>
                    Warning at (%)
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={Number(rule.config?.warning_percent || 80)}
                      onChange={(e) =>
                        update(feature.feature_key, {
                          config: {
                            ...rule.config,
                            warning_percent: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                )}
                {feature.feature_key === "notes.storage" &&
                  accessMode !== "locked" && (
                    <label>
                      Maximum file (MB)
                      <input
                        type="number"
                        min="1"
                        value={Number(rule.config?.max_file_mb || 25)}
                        onChange={(e) =>
                          update(feature.feature_key, {
                            config: {
                              ...rule.config,
                              max_file_mb: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                  )}
                {feature.meter_type !== "boolean" &&
                  accessMode === "limited" && (
                    <label>
                      When allowance ends
                      <select
                        value={String(rule.config?.after_limit || "upgrade")}
                        onChange={(e) =>
                          update(feature.feature_key, {
                            config: {
                              ...rule.config,
                              after_limit: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="upgrade">Show upgrade prompt</option>
                        <option value="readonly">Make read-only</option>
                        <option value="block">Block without prompt</option>
                      </select>
                    </label>
                  )}
                <label className="upgrade-copy">
                  Upgrade or locked message
                  <input
                    value={rule.upgrade_message}
                    onChange={(e) =>
                      update(feature.feature_key, {
                        upgrade_message: e.target.value,
                      })
                    }
                  />
                </label>
                <button onClick={() => void save(feature)}>
                  <Save />
                  Save
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {notice && <div className="access-toast">{notice}</div>}
      <style>{styles}</style>
      <style>{featureV2Styles}</style>
    </section>
  );
}
const styles = `.access-editor{display:grid;gap:14px}.access-editor>header{padding:18px;background:#172b4d;color:#fff;border-radius:14px;display:flex;align-items:center;justify-content:space-between;gap:15px}.access-editor>header>div{display:flex;align-items:center;gap:11px}.access-editor>header svg{color:#8cb5ff}.access-editor h2{font-size:17px;margin:0}.access-editor header p{font-size:9px;opacity:.7;margin:5px 0 0}.access-editor header select{width:190px;height:40px;border:0;border-radius:8px;padding:0 10px}.access-toolbar{display:grid;grid-template-columns:1fr 210px;gap:9px}.access-toolbar label{height:41px;padding:0 11px;border:1px solid #dfe5ed;border-radius:9px;background:#fff;display:flex;align-items:center;gap:8px}.access-toolbar svg{width:15px}.access-toolbar input{width:100%;border:0;outline:0}.access-toolbar select{border:1px solid #dfe5ed;border-radius:9px;background:#fff;padding:0 10px}.access-list{display:grid;gap:9px}.access-list article{display:grid;grid-template-columns:minmax(220px,1fr) minmax(520px,2fr);gap:18px;padding:16px;background:#fff;border:1px solid #e1e7ef;border-radius:12px}.feature-copy span{font-size:7px;text-transform:uppercase;color:#2863c7;font-weight:800}.feature-copy h3{margin:5px 0;font-size:13px}.feature-copy p{margin:0;color:#748196;font-size:9px}.feature-copy code{display:block;margin-top:7px;color:#98a1ae;font-size:7px}.feature-controls{display:grid;grid-template-columns:90px 120px 90px 100px minmax(170px,1fr) auto;gap:7px;align-items:end}.feature-controls label{display:grid;gap:5px;font-size:8px;color:#68768a}.feature-controls input,.feature-controls select{height:36px;min-width:0;border:1px solid #dfe5ed;border-radius:7px;background:#fff;padding:0 8px;font-size:8px}.access-toggle{align-self:center}.access-toggle input{width:auto;height:auto}.access-toggle span{font-weight:750;color:#2863c7}.feature-controls button{height:36px;border:0;border-radius:7px;background:#2863c7;color:#fff;padding:0 10px;display:flex;align-items:center;gap:5px;font-size:8px}.feature-controls button svg{width:13px}.access-toast{position:fixed;right:20px;bottom:20px;background:#172b4d;color:#fff;padding:11px 15px;border-radius:8px;font-size:9px}@media(max-width:1100px){.access-list article{grid-template-columns:1fr}.feature-controls{grid-template-columns:repeat(3,1fr)}.upgrade-copy{grid-column:span 2}}@media(max-width:650px){.access-editor>header{align-items:stretch;flex-direction:column}.access-editor header select{width:100%}.access-toolbar{grid-template-columns:1fr}.access-toolbar select{height:41px}.feature-controls{grid-template-columns:1fr 1fr}.upgrade-copy{grid-column:1/-1}.feature-controls button{grid-column:1/-1;justify-content:center}}`;
