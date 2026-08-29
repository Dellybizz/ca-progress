"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Trash2,
} from "lucide-react";
import { AppPageElement } from "@/context/ProgressContext";
import {
  BuilderSection,
  definitionFor,
  sectionRegistry,
  SettingField,
} from "@/components/page-builder/sectionRegistry";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;
type Page = {
  id: string;
  section_key: string;
  label: string;
  route: string;
  enabled: boolean;
};
type Plan = { id: string; name: string; rank: number };
type Feature = { feature_key: string; name: string };
const slug = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function PageBuilderStudio() {
  const [pages, setPages] = useState<Page[]>([]),
    [items, setItems] = useState<AppPageElement[]>([]),
    [plans, setPlans] = useState<Plan[]>([]),
    [features, setFeatures] = useState<Feature[]>([]);
  const [pageKey, setPageKey] = useState("dashboard"),
    [selectedId, setSelectedId] = useState(""),
    [device, setDevice] = useState<"desktop" | "mobile">("desktop"),
    [adding, setAdding] = useState<"section" | "block" | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const load = async () => {
    if (!supabase) return;
    const [p, e, pl, f] = await Promise.all([
      supabase
        .from("app_sections")
        .select("id,section_key,label,route,enabled")
        .order("sort_order"),
      supabase.from("app_page_elements").select("*").order("sort_order"),
      supabase.from("subscription_plans").select("id,name,rank").order("rank"),
      supabase.from("app_features").select("feature_key,name").order("name"),
    ]);
    setPages((p.data || []) as Page[]);
    setItems((e.data || []) as AppPageElement[]);
    setPlans((pl.data || []) as Plan[]);
    setFeatures((f.data || []) as Feature[]);
  };
  useEffect(() => {
    void load();
  }, []);
  const pageItems = useMemo(
      () =>
        items
          .filter((x) => x.page_key === pageKey)
          .sort((a, b) => a.sort_order - b.sort_order),
      [items, pageKey],
    ),
    roots = pageItems.filter((x) => !x.parent_key),
    selected = items.find((x) => x.id === selectedId) || null;
  useEffect(() => {
    if (!pageItems.some((x) => x.id === selectedId))
      setSelectedId(pageItems[0]?.id || "");
  }, [pageKey, pageItems, selectedId]);
  const flash = (text: string) => {
      setNotice(text);
      window.setTimeout(() => setNotice(""), 2200);
    },
    update = (patch: Partial<AppPageElement>) =>
      selected &&
      setItems((all) =>
        all.map((x) => (x.id === selected.id ? { ...x, ...patch } : x)),
      );
  const save = async () => {
    if (!supabase || !selected) return;
    setBusy(true);
    const { error } = await supabase
      .from("app_page_elements")
      .update({
        label: selected.label,
        description: selected.description,
        enabled: selected.enabled,
        audience: selected.audience,
        minimum_plan_rank: selected.minimum_plan_rank,
        parent_key: selected.parent_key,
        sort_order: selected.sort_order,
        config: selected.config,
        appearance: selected.appearance,
      })
      .eq("id", selected.id);
    setBusy(false);
    flash(error ? error.message : "Saved");
  };
  const add = async (type: string, asBlock: boolean) => {
    if (!supabase) return;
    const def = sectionRegistry[type],
      parent = asBlock
        ? selected?.parent_key || selected?.element_key || null
        : null,
      payload = {
        page_key: pageKey,
        element_key: `${slug(def.name)}-${Date.now().toString().slice(-6)}`,
        parent_key: parent,
        region: "main",
        element_type: asBlock ? "content_block" : "section",
        enabled: true,
        audience: "all",
        minimum_plan_rank: 0,
        sort_order: (pageItems.at(-1)?.sort_order || 0) + 10,
        ...def.defaults,
      };
    const { data, error } = await supabase
      .from("app_page_elements")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      flash(error.message);
      return;
    }
    setItems((all) => [...all, data as AppPageElement]);
    setSelectedId((data as AppPageElement).id);
    setAdding(null);
    flash(asBlock ? "Block added" : "Section added");
  };
  const remove = async () => {
    if (
      !supabase ||
      !selected ||
      selected.element_key === "native-content" ||
      !confirm(`Delete ${selected.label}?`)
    )
      return;
    const children = items.filter((x) => x.parent_key === selected.element_key),
      ids = [selected.id, ...children.map((x) => x.id)];
    await supabase.from("app_page_elements").delete().in("id", ids);
    setItems((all) => all.filter((x) => !ids.includes(x.id)));
    setSelectedId("");
    flash("Deleted");
  };
  const duplicate = async () => {
    if (!supabase || !selected) return;
    const { id, ...copy } = selected;
    void id;
    const { data, error } = await supabase
      .from("app_page_elements")
      .insert({
        ...copy,
        element_key: `${selected.element_key}-copy-${Date.now().toString().slice(-4)}`,
        label: `${selected.label} copy`,
        sort_order: selected.sort_order + 1,
      })
      .select("*")
      .single();
    if (error) {
      flash(error.message);
      return;
    }
    setItems((all) => [...all, data as AppPageElement]);
    setSelectedId((data as AppPageElement).id);
  };
  const move = async (dir: -1 | 1) => {
    if (!supabase || !selected) return;
    const peers = pageItems.filter((x) => x.parent_key === selected.parent_key),
      index = peers.findIndex((x) => x.id === selected.id),
      other = peers[index + dir];
    if (!other) return;
    await Promise.all([
      supabase
        .from("app_page_elements")
        .update({ sort_order: other.sort_order })
        .eq("id", selected.id),
      supabase
        .from("app_page_elements")
        .update({ sort_order: selected.sort_order })
        .eq("id", other.id),
    ]);
    void load();
  };
  const fieldValue = (field: SettingField) =>
    field.target === "appearance"
      ? selected?.appearance?.[field.key]
      : field.key === "label"
        ? selected?.label
        : field.key === "description"
          ? selected?.description
          : selected?.config?.[field.key];
  const setField = (field: SettingField, value: string | number) => {
    if (!selected) return;
    if (field.key === "label") update({ label: String(value) });
    else if (field.key === "description")
      update({ description: String(value) });
    else if (field.target === "appearance")
      update({ appearance: { ...selected.appearance, [field.key]: value } });
    else update({ config: { ...selected.config, [field.key]: value } });
  };
  return (
    <div className="theme-editor">
      <header className="editor-topbar">
        <div>
          <b>Page editor</b>
          <span>Changes affect the live application</span>
        </div>
        <label>
          Page
          <select value={pageKey} onChange={(e) => setPageKey(e.target.value)}>
            {pages.map((p) => (
              <option key={p.id} value={p.section_key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <div className="device-switch">
          <button
            className={device === "desktop" ? "active" : ""}
            onClick={() => setDevice("desktop")}
          >
            <Monitor />
          </button>
          <button
            className={device === "mobile" ? "active" : ""}
            onClick={() => setDevice("mobile")}
          >
            <Smartphone />
          </button>
        </div>
        <button
          className="save-button"
          disabled={!selected || busy}
          onClick={() => void save()}
        >
          <Save />
          {busy ? "Saving…" : "Save"}
        </button>
      </header>
      <div className="editor-body">
        <aside className="section-sidebar">
          <header>
            <b>Template</b>
            <span>{pageItems.length} items</span>
          </header>
          <div className="section-tree">
            {roots.map((root) => (
              <div className="tree-group" key={root.id}>
                <TreeRow
                  item={root}
                  active={selectedId === root.id}
                  onSelect={() => setSelectedId(root.id)}
                  onToggle={() =>
                    setItems((all) =>
                      all.map((x) =>
                        x.id === root.id ? { ...x, enabled: !x.enabled } : x,
                      ),
                    )
                  }
                />
                {pageItems
                  .filter((x) => x.parent_key === root.element_key)
                  .map((child) => (
                    <TreeRow
                      key={child.id}
                      item={child}
                      child
                      active={selectedId === child.id}
                      onSelect={() => setSelectedId(child.id)}
                      onToggle={() =>
                        setItems((all) =>
                          all.map((x) =>
                            x.id === child.id
                              ? { ...x, enabled: !x.enabled }
                              : x,
                          ),
                        )
                      }
                    />
                  ))}
              </div>
            ))}
          </div>
          <div className="sidebar-add">
            <button onClick={() => setAdding("section")}>
              <Plus />
              Add section
            </button>
            {selected && (
              <button onClick={() => setAdding("block")}>
                <Plus />
                Add block
              </button>
            )}
          </div>
        </aside>
        <main className="preview-stage">
          <div className={`store-preview ${device}`}>
            <div className="preview-bar">
              <i />
              <i />
              <i />
              <span>{pages.find((p) => p.section_key === pageKey)?.route}</span>
            </div>
            <div className="preview-content">
              {roots
                .filter((x) => x.enabled)
                .map((root) => (
                  <div
                    key={root.id}
                    className={`preview-item ${selectedId === root.id ? "selected" : ""}`}
                    onClick={() => setSelectedId(root.id)}
                  >
                    <BuilderSection item={root} preview />
                    {pageItems
                      .filter(
                        (x) => x.parent_key === root.element_key && x.enabled,
                      )
                      .map((child) => (
                        <div
                          key={child.id}
                          className={`preview-item child ${selectedId === child.id ? "selected" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(child.id);
                          }}
                        >
                          <BuilderSection item={child} preview />
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          </div>
        </main>
        <aside className="settings-sidebar">
          {selected ? (
            <>
              <header>
                <div>
                  <b>{selected.label}</b>
                  <span>{definitionFor(selected).name}</span>
                </div>
                <div>
                  <button onClick={() => void move(-1)}>
                    <ChevronUp />
                  </button>
                  <button onClick={() => void move(1)}>
                    <ChevronDown />
                  </button>
                </div>
              </header>
              <SettingsGroup title="Section settings">
                {definitionFor(selected).fields.map((field) => (
                  <Field
                    key={`${field.target}-${field.key}`}
                    field={field}
                    value={fieldValue(field)}
                    onChange={(value) => setField(field, value)}
                  />
                ))}
              </SettingsGroup>
              <SettingsGroup title="Visibility">
                <label className="setting-field">
                  Audience
                  <select
                    value={selected.audience}
                    onChange={(e) =>
                      update({
                        audience: e.target.value as AppPageElement["audience"],
                      })
                    }
                  >
                    <option value="all">Everyone</option>
                    <option value="guest">Guests only</option>
                    <option value="member">Signed-in members</option>
                  </select>
                </label>
                <label className="setting-field">
                  Minimum plan
                  <select
                    value={selected.minimum_plan_rank}
                    onChange={(e) =>
                      update({ minimum_plan_rank: Number(e.target.value) })
                    }
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.rank}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="setting-field">
                  Feature rule
                  <select
                    value={String(selected.config?.featureKey || "")}
                    onChange={(e) =>
                      update({
                        config: {
                          ...selected.config,
                          featureKey: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="">No feature rule</option>
                    {features.map((f) => (
                      <option key={f.feature_key} value={f.feature_key}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="toggle-setting">
                  <span>
                    <b>Show section</b>
                    <small>Visible on the live page</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={selected.enabled}
                    onChange={(e) => update({ enabled: e.target.checked })}
                  />
                </label>
              </SettingsGroup>
              <div className="item-actions">
                <button onClick={() => void duplicate()}>
                  <Copy />
                  Duplicate
                </button>
                <button
                  disabled={selected.element_key === "native-content"}
                  onClick={() => void remove()}
                >
                  <Trash2 />
                  Delete
                </button>
              </div>
            </>
          ) : (
            <div className="empty-settings">
              Select a section to edit its settings.
            </div>
          )}
        </aside>
      </div>
      {adding && (
        <div className="add-drawer" onClick={() => setAdding(null)}>
          <section onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <b>Add {adding}</b>
                <span>Choose a self-contained section type</span>
              </div>
              <button onClick={() => setAdding(null)}>×</button>
            </header>
            {Object.values(sectionRegistry)
              .filter(
                (d) =>
                  d.type !== "native" &&
                  d.type !== "native-reference" &&
                  !(adding === "block" && d.type === "hero"),
              )
              .map((def) => (
                <button
                  key={def.type}
                  onClick={() => void add(def.type, adding === "block")}
                >
                  <span>
                    <b>{def.name}</b>
                    <small>{def.description}</small>
                  </span>
                  <ChevronRight />
                </button>
              ))}
          </section>
        </div>
      )}
      {notice && <div className="editor-toast">{notice}</div>}
      <style>{styles}</style>
    </div>
  );
}

function TreeRow({
  item,
  child = false,
  active,
  onSelect,
  onToggle,
}: {
  item: AppPageElement;
  child?: boolean;
  active: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  return (
    <button
      className={`tree-row ${child ? "child" : ""} ${active ? "active" : ""}`}
      onClick={onSelect}
    >
      <GripVertical />
      <span>
        <b>{item.label}</b>
        <small>{definitionFor(item).name}</small>
      </span>
      <i
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {item.enabled ? <Eye /> : <EyeOff />}
      </i>
    </button>
  );
}
function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="settings-group">
      <button onClick={() => setOpen(!open)}>
        <b>{title}</b>
        {open ? <ChevronDown /> : <ChevronRight />}
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}
function Field({
  field,
  value,
  onChange,
}: {
  field: SettingField;
  value: unknown;
  onChange: (v: string | number) => void;
}) {
  const val = String(value ?? "");
  return (
    <label className="setting-field">
      {field.label}
      {field.type === "textarea" ? (
        <textarea value={val} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "select" ? (
        <select value={val} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <>
          <input
            type={field.type === "url" ? "url" : field.type}
            value={val}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) =>
              onChange(
                field.type === "range" || field.type === "number"
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
          />
          {field.type === "range" && <small>{val}px</small>}
        </>
      )}
    </label>
  );
}

const styles = `.theme-editor{height:calc(100dvh - 104px);min-height:650px;border:1px solid #dfe3e8;border-radius:12px;overflow:hidden;background:#f1f2f4;color:#202223}.editor-topbar{height:62px;background:#fff;border-bottom:1px solid #dfe3e8;display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:16px;padding:0 16px}.editor-topbar>div:first-child{display:grid}.editor-topbar b{font-size:13px}.editor-topbar span{font-size:9px;color:#6d7175}.editor-topbar>label{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:650}.editor-topbar select{width:190px;height:36px;border:1px solid #c9cccf;border-radius:7px;background:#fff;padding:0 10px}.device-switch{display:flex;padding:3px;background:#f1f2f4;border-radius:8px}.device-switch button{width:34px;height:30px;border:0;background:transparent;border-radius:6px;color:#6d7175;display:grid;place-items:center}.device-switch button.active{background:#fff;color:#2863c7;box-shadow:0 1px 3px #0002}.device-switch svg,.save-button svg{width:15px}.save-button{height:36px;padding:0 15px;border:0;border-radius:7px;background:#2863c7;color:#fff;font-weight:700;display:flex;align-items:center;gap:7px}.editor-body{height:calc(100% - 62px);display:grid;grid-template-columns:285px minmax(400px,1fr) 330px}.section-sidebar,.settings-sidebar{background:#fff;min-width:0;overflow:auto}.section-sidebar{border-right:1px solid #dfe3e8;display:flex;flex-direction:column}.settings-sidebar{border-left:1px solid #dfe3e8}.section-sidebar>header,.settings-sidebar>header{height:55px;padding:0 14px;border-bottom:1px solid #e1e3e5;display:flex;align-items:center;justify-content:space-between}.section-sidebar header span,.settings-sidebar header span{font-size:9px;color:#8c9196}.section-tree{overflow:auto;padding:8px}.tree-group{margin-bottom:5px}.tree-row{width:100%;height:50px;border:0;background:#fff;border-radius:7px;display:grid;grid-template-columns:18px minmax(0,1fr) 25px;align-items:center;text-align:left;color:#4b535a;padding:0 8px}.tree-row:hover{background:#f6f6f7}.tree-row.active{background:#edf4ff;box-shadow:inset 3px 0 #2863c7;color:#174ea6}.tree-row.child{margin-left:22px;width:calc(100% - 22px);height:45px}.tree-row>svg{width:13px;color:#a0a5aa}.tree-row span{display:grid;min-width:0}.tree-row b{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tree-row small{font-size:8px;color:#8c9196}.tree-row i{display:grid}.tree-row i svg{width:14px}.sidebar-add{margin-top:auto;border-top:1px solid #e1e3e5;padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:7px}.sidebar-add button{height:36px;border:1px solid #c9cccf;border-radius:7px;background:#fff;font-size:9px;font-weight:650;display:flex;align-items:center;justify-content:center;gap:5px}.sidebar-add svg{width:13px}.preview-stage{overflow:auto;padding:24px;background:#f1f2f4}.store-preview{margin:auto;background:#f8fafc;border:1px solid #cfd5dc;box-shadow:0 8px 28px #1f29371a;min-height:600px;width:min(100%,960px);transition:.2s}.store-preview.mobile{width:390px;max-width:100%}.preview-bar{height:32px;border-bottom:1px solid #e1e5e9;background:#fff;display:flex;align-items:center;gap:5px;padding:0 10px}.preview-bar i{width:6px;height:6px;border-radius:50%;background:#cbd1d8}.preview-bar span{margin-left:7px;color:#9aa1a9;font-size:8px}.preview-content{padding:15px;display:flex;flex-direction:column;gap:11px}.preview-item{position:relative;border:2px solid transparent;border-radius:4px}.preview-item.selected{border-color:#2863c7}.preview-item.selected:before{content:'Selected';position:absolute;z-index:3;top:-18px;right:-2px;background:#2863c7;color:#fff;font-size:7px;padding:3px 6px}.preview-item.child{margin:8px}.registry-section{border:1px solid;display:flex;gap:18px;align-items:center;box-sizing:border-box}.registry-section img{width:32%;max-height:160px;object-fit:cover;border-radius:10px}.registry-section h2{margin:0 0 6px;font-size:17px}.registry-section p{margin:0;font-size:10px;line-height:1.5;opacity:.75}.registry-section a{display:inline-flex;margin-top:10px;padding:7px 10px;border-radius:6px;background:#2863c7;color:#fff;font-size:8px}.registry-native{min-height:180px;border:1px dashed #b7bec7;border-radius:14px;background:#fff;display:grid;place-content:center;text-align:center;color:#7c8794}.registry-native b{font-size:12px}.registry-native span{font-size:9px;margin-top:5px}.settings-sidebar>header>div:first-child{display:grid}.settings-sidebar>header>div:last-child{display:flex}.settings-sidebar>header button{border:0;background:#fff;width:28px;color:#6d7175}.settings-sidebar>header svg{width:15px}.settings-group{border-bottom:1px solid #e1e3e5}.settings-group>button{width:100%;height:45px;padding:0 14px;border:0;background:#fff;display:flex;align-items:center;justify-content:space-between}.settings-group>button svg{width:14px}.settings-group>div{padding:2px 14px 16px;display:grid;gap:13px}.setting-field{display:grid;gap:6px;font-size:9px;color:#5c5f62}.setting-field input,.setting-field textarea,.setting-field select{width:100%;box-sizing:border-box;border:1px solid #c9cccf;border-radius:7px;background:#fff;padding:9px;font-size:10px}.setting-field textarea{min-height:82px;resize:vertical}.setting-field input[type=color]{height:40px;padding:4px}.setting-field input[type=range]{padding:0}.setting-field>small{text-align:right}.toggle-setting{display:flex;align-items:center;justify-content:space-between}.toggle-setting span{display:grid}.toggle-setting b{font-size:9px}.toggle-setting small{font-size:8px;color:#8c9196}.item-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px}.item-actions button{height:37px;border:1px solid #c9cccf;border-radius:7px;background:#fff;font-size:9px;display:flex;align-items:center;justify-content:center;gap:6px}.item-actions button:last-child{color:#b42318}.item-actions svg{width:14px}.empty-settings{padding:30px 18px;color:#8c9196;font-size:10px;text-align:center}.add-drawer{position:fixed;inset:0;z-index:80;background:#0005;display:flex}.add-drawer>section{width:340px;max-width:90vw;height:100%;background:#fff;padding:12px;overflow:auto;box-shadow:8px 0 30px #0002}.add-drawer header{height:55px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e1e3e5;margin-bottom:8px}.add-drawer header div{display:grid}.add-drawer header span{font-size:9px;color:#8c9196}.add-drawer header button{border:0;background:#fff;font-size:24px}.add-drawer>section>button{width:100%;min-height:62px;border:0;border-bottom:1px solid #eee;background:#fff;display:flex;align-items:center;justify-content:space-between;text-align:left;padding:10px}.add-drawer>section>button:hover{background:#f6f6f7}.add-drawer>section>button span{display:grid;gap:4px}.add-drawer>section>button b{font-size:11px}.add-drawer>section>button small{font-size:9px;color:#8c9196}.add-drawer svg{width:15px}.editor-toast{position:fixed;z-index:100;bottom:20px;left:50%;transform:translateX(-50%);background:#202223;color:#fff;padding:10px 16px;border-radius:8px;font-size:10px}@media(max-width:1000px){.editor-body{grid-template-columns:250px minmax(350px,1fr)}.settings-sidebar{position:fixed;z-index:50;right:0;top:0;width:330px;height:100dvh;box-shadow:-10px 0 30px #0002}}@media(max-width:720px){.theme-editor{height:calc(100dvh - 80px)}.editor-topbar{grid-template-columns:1fr auto auto;padding:0 9px;gap:6px}.editor-topbar>div:first-child{display:none}.editor-topbar>label{font-size:0}.editor-topbar select{width:150px}.editor-body{grid-template-columns:1fr}.section-sidebar{position:absolute;z-index:10;width:min(285px,85vw);height:calc(100% - 62px)}.preview-stage{padding:10px}.settings-sidebar{width:min(330px,92vw)}.save-button{padding:0 10px}.save-button svg{display:none}}`;
