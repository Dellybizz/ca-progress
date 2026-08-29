"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Trash2,
} from "lucide-react";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

type Page = {
  id: string;
  section_key: string;
  label: string;
  description: string;
  route: string;
  enabled: boolean;
  audience: "all" | "guest" | "member";
  minimum_plan_rank: number;
  sort_order: number;
  appearance: Record<string, unknown>;
};
type Plan = { id: string; name: string; rank: number };
type Feature = { feature_key: string; name: string };
type Block = {
  id: string;
  page_key: string;
  element_key: string;
  parent_key: string | null;
  region: string;
  element_type: "section" | "card" | "quick_action" | "content_block";
  label: string;
  description: string;
  enabled: boolean;
  audience: "all" | "guest" | "member";
  minimum_plan_rank: number;
  sort_order: number;
  config: Record<string, unknown>;
  appearance: Record<string, unknown>;
};

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const variants = ["text", "notice", "hero", "link", "spacer"];

export default function PageBuilderStudio() {
  const [pages, setPages] = useState<Page[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pageKey, setPageKey] = useState("dashboard");
  const [selectedId, setSelectedId] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [notice, setNotice] = useState("");
  const load = async () => {
    if (!supabase) return;
    const [p, b, pl, f] = await Promise.all([
      supabase.from("app_sections").select("*").order("sort_order"),
      supabase.from("app_page_elements").select("*").order("sort_order"),
      supabase.from("subscription_plans").select("id,name,rank").order("rank"),
      supabase.from("app_features").select("feature_key,name").order("name"),
    ]);
    setPages((p.data || []) as Page[]);
    setBlocks((b.data || []) as Block[]);
    setPlans((pl.data || []) as Plan[]);
    setFeatures((f.data || []) as Feature[]);
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const first = blocks.find((item) => item.page_key === pageKey);
    setSelectedId(first?.id || "");
  }, [pageKey]);
  const selected = blocks.find((item) => item.id === selectedId) || null;
  const pageBlocks = useMemo(
    () =>
      blocks
        .filter((item) => item.page_key === pageKey)
        .sort((a, b) => a.sort_order - b.sort_order),
    [blocks, pageKey],
  );
  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };
  const update = (patch: Partial<Block>) =>
    selected &&
    setBlocks((all) =>
      all.map((item) =>
        item.id === selected.id ? { ...item, ...patch } : item,
      ),
    );
  const save = async () => {
    if (!supabase || !selected) return;
    const { error } = await supabase
      .from("app_page_elements")
      .update({ ...selected, updated_at: new Date().toISOString() })
      .eq("id", selected.id);
    flash(error ? error.message : "Block saved");
  };
  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    const form = new FormData(e.currentTarget);
    const label = String(form.get("label") || "").trim();
    const variant = String(form.get("variant") || "text");
    if (!label) return;
    const { data, error } = await supabase
      .from("app_page_elements")
      .insert({
        page_key: pageKey,
        element_key: `${slug(label)}-${Date.now().toString().slice(-5)}`,
        label,
        description: "",
        element_type: "content_block",
        region: "main",
        sort_order: (pageBlocks.at(-1)?.sort_order || 0) + 10,
        config: { variant },
        appearance: {
          backgroundColor: "#ffffff",
          textColor: "#1d2939",
          borderColor: "#e2e8f0",
          borderRadius: 16,
          padding: 22,
          alignment: "left",
        },
      })
      .select("*")
      .single();
    if (error) {
      flash(error.message);
      return;
    }
    setBlocks((all) => [...all, data as Block]);
    setSelectedId((data as Block).id);
    e.currentTarget.reset();
    flash("Block added");
  };
  const remove = async () => {
    if (
      !supabase ||
      !selected ||
      selected.element_key === "native-content" ||
      !window.confirm(`Delete ${selected.label}?`)
    )
      return;
    const { error } = await supabase
      .from("app_page_elements")
      .delete()
      .eq("id", selected.id);
    if (error) {
      flash(error.message);
      return;
    }
    setBlocks((all) => all.filter((item) => item.id !== selected.id));
    setSelectedId("");
    flash("Block deleted");
  };
  const move = async (direction: -1 | 1) => {
    if (!supabase || !selected) return;
    const index = pageBlocks.findIndex((item) => item.id === selected.id);
    const other = pageBlocks[index + direction];
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
  const togglePage = async (page: Page) => {
    if (!supabase) return;
    await supabase
      .from("app_sections")
      .update({ enabled: !page.enabled })
      .eq("id", page.id);
    setPages((all) =>
      all.map((item) =>
        item.id === page.id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  };
  const previewStyle = (item: Block) => ({
    background: String(item.appearance?.backgroundColor || "#fff"),
    color: String(item.appearance?.textColor || "#1d2939"),
    borderColor: String(item.appearance?.borderColor || "#e2e8f0"),
    borderRadius: Number(item.appearance?.borderRadius || 14),
    padding: Number(item.appearance?.padding || 18),
    textAlign: String(item.appearance?.alignment || "left") as
      "left" | "center" | "right",
  });
  return (
    <div className="shopify-builder">
      <aside className="builder-pages">
        <header>
          <b>Pages</b>
          <small>Select a template</small>
        </header>
        {pages.map((page) => (
          <button
            key={page.id}
            className={pageKey === page.section_key ? "active" : ""}
            onClick={() => setPageKey(page.section_key)}
          >
            <span>
              <b>{page.label}</b>
              <small>{page.route}</small>
            </span>
            <i
              role="button"
              onClick={(event) => {
                event.stopPropagation();
                void togglePage(page);
              }}
            >
              {page.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
            </i>
          </button>
        ))}
      </aside>
      <section className="builder-workspace">
        <header>
          <div>
            <b>
              {pages.find((page) => page.section_key === pageKey)?.label ||
                pageKey}
            </b>
            <small>Drag-free safe ordering · select a block to edit</small>
          </div>
          <div>
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
        </header>
        <div className={`builder-preview ${device}`}>
          <div className="preview-browser">
            <span />
            <span />
            <span />
          </div>
          <main>
            {pageBlocks
              .filter((item) => item.enabled)
              .map((item) => (
                <section
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`${selectedId === item.id ? "selected" : ""} preview-${String(item.config?.variant || "native")}`}
                  style={previewStyle(item)}
                >
                  {item.element_key === "native-content" ? (
                    <div className="native-placeholder">
                      <b>
                        Native{" "}
                        {
                          pages.find((page) => page.section_key === pageKey)
                            ?.label
                        }{" "}
                        content
                      </b>
                      <small>The real application section renders here</small>
                    </div>
                  ) : (
                    <>
                      <h3>{item.label}</h3>
                      {item.description && <p>{item.description}</p>}
                      {Boolean(item.config?.buttonLabel) && (
                        <button>{String(item.config.buttonLabel)}</button>
                      )}
                    </>
                  )}
                </section>
              ))}
          </main>
        </div>
      </section>
      <aside className="builder-tree">
        <header>
          <b>Sections and blocks</b>
          <small>{pageBlocks.length} blocks</small>
        </header>
        <div className="tree-list">
          {pageBlocks.map((item, index) => (
            <button
              className={selectedId === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setSelectedId(item.id)}
            >
              <span>
                <b>{item.label}</b>
                <small>
                  {item.element_key} · {item.element_type}
                </small>
              </span>
              <i>{item.enabled ? <Eye size={13} /> : <EyeOff size={13} />}</i>
              <em>
                <ChevronUp
                  onClick={(event) => {
                    event.stopPropagation();
                    if (index > 0) void move(-1);
                  }}
                />
                <ChevronDown
                  onClick={(event) => {
                    event.stopPropagation();
                    if (index < pageBlocks.length - 1) void move(1);
                  }}
                />
              </em>
            </button>
          ))}
        </div>
        <form className="builder-add" onSubmit={add}>
          <input name="label" placeholder="New block name" required />
          <select name="variant">
            {variants.map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
          <button>
            <Plus />
            Add block
          </button>
        </form>
      </aside>
      <aside className="builder-inspector">
        <header>
          <b>{selected?.label || "Select a block"}</b>
          <small>Block settings</small>
        </header>
        {selected && (
          <div className="inspector-fields">
            <label>
              Heading
              <input
                value={selected.label}
                onChange={(e) => update({ label: e.target.value })}
              />
            </label>
            <label>
              Text
              <textarea
                value={selected.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </label>
            <label>
              Design
              <select
                value={String(selected.config?.variant || "native")}
                onChange={(e) =>
                  update({
                    config: { ...selected.config, variant: e.target.value },
                  })
                }
              >
                <option value="native">Native content</option>
                {variants.map((value) => (
                  <option value={value} key={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Visibility
              <select
                value={selected.audience}
                onChange={(e) =>
                  update({ audience: e.target.value as Block["audience"] })
                }
              >
                <option value="all">Everyone</option>
                <option value="guest">Guests only</option>
                <option value="member">Members only</option>
              </select>
            </label>
            <label>
              Feature access rule
              <select
                value={String(selected.config?.featureKey || "")}
                onChange={(e) =>
                  update({
                    config: { ...selected.config, featureKey: e.target.value },
                  })
                }
              >
                <option value="">No feature rule</option>
                {features.map((feature) => (
                  <option value={feature.feature_key} key={feature.feature_key}>
                    {feature.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Minimum plan
              <select
                value={selected.minimum_plan_rank}
                onChange={(e) =>
                  update({ minimum_plan_rank: Number(e.target.value) })
                }
              >
                {plans.map((plan) => (
                  <option value={plan.rank} key={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={selected.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
              />
              Show block
            </label>
            <label>
              Button text
              <input
                value={String(selected.config?.buttonLabel || "")}
                onChange={(e) =>
                  update({
                    config: { ...selected.config, buttonLabel: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Button/link URL
              <input
                value={String(selected.config?.route || "")}
                onChange={(e) =>
                  update({
                    config: { ...selected.config, route: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Image URL
              <input
                value={String(selected.config?.imageUrl || "")}
                onChange={(e) =>
                  update({
                    config: { ...selected.config, imageUrl: e.target.value },
                  })
                }
              />
            </label>
            <div className="color-row">
              <label>
                Background
                <input
                  type="color"
                  value={String(
                    selected.appearance?.backgroundColor || "#ffffff",
                  )}
                  onChange={(e) =>
                    update({
                      appearance: {
                        ...selected.appearance,
                        backgroundColor: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <label>
                Text
                <input
                  type="color"
                  value={String(selected.appearance?.textColor || "#1d2939")}
                  onChange={(e) =>
                    update({
                      appearance: {
                        ...selected.appearance,
                        textColor: e.target.value,
                      },
                    })
                  }
                />
              </label>
            </div>
            <label>
              Padding
              <input
                type="range"
                min="0"
                max="80"
                value={Number(selected.appearance?.padding || 22)}
                onChange={(e) =>
                  update({
                    appearance: {
                      ...selected.appearance,
                      padding: Number(e.target.value),
                    },
                  })
                }
              />
              <span>{Number(selected.appearance?.padding || 22)} px</span>
            </label>
            <label>
              Corner radius
              <input
                type="range"
                min="0"
                max="40"
                value={Number(selected.appearance?.borderRadius || 16)}
                onChange={(e) =>
                  update({
                    appearance: {
                      ...selected.appearance,
                      borderRadius: Number(e.target.value),
                    },
                  })
                }
              />
              <span>{Number(selected.appearance?.borderRadius || 16)} px</span>
            </label>
            <div className="inspector-actions">
              <button onClick={() => void save()}>
                <Save />
                Save
              </button>
              <button
                disabled={selected.element_key === "native-content"}
                onClick={() => void remove()}
              >
                <Trash2 />
              </button>
            </div>
          </div>
        )}
      </aside>
      {notice && <div className="builder-toast">{notice}</div>}
      <style>{styles}</style>
    </div>
  );
}

const styles = `.shopify-builder{height:calc(100dvh - 105px);min-height:650px;display:grid;grid-template-columns:190px minmax(360px,1fr) 230px 270px;background:#eef1f5;border:1px solid #dce2e9;border-radius:13px;overflow:hidden}.builder-pages,.builder-tree,.builder-inspector{background:#fff;min-width:0;overflow:auto}.builder-pages,.builder-tree{border-right:1px solid #dfe4ea}.builder-inspector{border-left:1px solid #dfe4ea}.shopify-builder aside>header,.builder-workspace>header{height:59px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e4e8ed}.shopify-builder header>b,.shopify-builder header div>b{font-size:11px}.shopify-builder header small,.shopify-builder header div>small{display:block;color:#8a95a5;font-size:8px;margin-top:3px}.builder-pages>button{width:100%;border:0;border-bottom:1px solid #f0f2f5;background:#fff;padding:11px 12px;display:flex;justify-content:space-between;align-items:center;text-align:left;color:#566477}.builder-pages>button span,.tree-list button span{min-width:0;display:grid;gap:3px}.builder-pages>button b,.tree-list b{font-size:10px}.builder-pages>button small,.tree-list small{font-size:7px;color:#929cab;overflow:hidden;text-overflow:ellipsis}.builder-pages>button.active{background:#edf3ff;color:#245fc2}.builder-pages i,.tree-list i{display:grid;color:#7e8b9e}.builder-workspace{min-width:0;overflow:auto}.builder-workspace>header{background:#fff}.builder-workspace>header>div:first-child{display:grid}.builder-workspace>header>div:last-child{display:flex;gap:3px}.builder-workspace>header button{width:32px;height:30px;border:0;border-radius:6px;background:#f0f3f7;color:#66758a;display:grid;place-items:center}.builder-workspace>header button.active{background:#dfeaff;color:#2863c7}.builder-workspace>header svg{width:14px}.builder-preview{width:calc(100% - 40px);max-width:850px;min-height:560px;margin:24px auto;background:#f7f9fc;border:1px solid #d9e0e9;box-shadow:0 12px 35px #263b5a15;transition:.2s}.builder-preview.mobile{width:350px;max-width:calc(100% - 26px)}.preview-browser{height:30px;background:#fff;border-bottom:1px solid #e3e8ef;padding:0 10px;display:flex;align-items:center;gap:5px}.preview-browser span{width:6px;height:6px;border-radius:50%;background:#ccd3dc}.builder-preview main{padding:14px;display:flex;flex-direction:column;gap:10px}.builder-preview main>section{border:1px solid;cursor:pointer;position:relative;min-height:55px}.builder-preview main>section.selected:after{content:'Selected';position:absolute;right:5px;top:5px;background:#2863c7;color:white;border-radius:4px;padding:3px 5px;font-size:6px}.builder-preview h3{margin:0 0 6px;font-size:13px}.builder-preview p{margin:0;font-size:9px;opacity:.7;white-space:pre-wrap}.builder-preview section>button{margin-top:9px;border:0;border-radius:6px;background:#2863c7;color:#fff;padding:7px 9px;font-size:8px}.native-placeholder{min-height:100px;display:grid;place-content:center;text-align:center;color:#8290a2}.native-placeholder b{font-size:11px}.native-placeholder small{font-size:8px}.builder-tree{display:flex;flex-direction:column}.tree-list{overflow:auto}.tree-list>button{width:100%;min-height:52px;border:0;border-bottom:1px solid #eef1f4;background:#fff;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:6px;padding:8px 9px;text-align:left;color:#59677b}.tree-list>button.active{box-shadow:inset 3px 0 #2863c7;background:#f3f7ff}.tree-list em{display:grid;gap:1px}.tree-list em svg{width:13px;height:13px;color:#8995a6}.builder-add{margin-top:auto;padding:9px;border-top:1px solid #e4e8ed;display:grid;gap:6px}.builder-add input,.builder-add select{height:34px;border:1px solid #dce2ea;border-radius:7px;padding:0 8px;font-size:8px}.builder-add button{height:34px;border:0;border-radius:7px;background:#2863c7;color:#fff;display:flex;align-items:center;justify-content:center;gap:5px;font-size:8px}.builder-add svg{width:13px}.inspector-fields{padding:12px;display:grid;gap:10px}.inspector-fields label{display:grid;gap:5px;font-size:8px;color:#68768a}.inspector-fields input,.inspector-fields textarea,.inspector-fields select{width:100%;border:1px solid #dce2e9;border-radius:7px;padding:8px;font-size:9px;background:#fff}.inspector-fields textarea{min-height:65px;resize:vertical}.inline-check{display:flex!important;align-items:center;gap:7px!important}.inline-check input{width:auto}.color-row{display:grid;grid-template-columns:1fr 1fr;gap:7px}.color-row input{height:35px;padding:3px}.inspector-fields input[type=range]{padding:0}.inspector-fields label>span{text-align:right;font-size:7px}.inspector-actions{display:grid;grid-template-columns:1fr 38px;gap:6px}.inspector-actions button{height:38px;border:0;border-radius:8px;background:#2863c7;color:#fff;display:flex;align-items:center;justify-content:center;gap:5px;font-size:9px}.inspector-actions button:last-child{background:#fff0f0;color:#b54747}.inspector-actions button:disabled{opacity:.35}.inspector-actions svg{width:14px}.builder-toast{position:fixed;right:20px;bottom:20px;background:#172b4d;color:#fff;border-radius:8px;padding:10px 14px;font-size:9px}@media(max-width:1200px){.shopify-builder{grid-template-columns:160px minmax(330px,1fr) 210px}.builder-inspector{position:fixed;z-index:30;right:0;top:0;height:100dvh;width:280px;box-shadow:-12px 0 35px #17263d22}}@media(max-width:850px){.shopify-builder{height:auto;min-height:800px;grid-template-columns:1fr}.builder-pages{display:flex;overflow-x:auto;border-right:0;border-bottom:1px solid #dfe4ea}.builder-pages>header{display:none}.builder-pages>button{flex:0 0 140px;border-right:1px solid #eef1f4}.builder-tree{grid-row:2;max-height:290px;border-right:0}.builder-workspace{grid-row:3;min-height:650px}.builder-inspector{width:min(300px,92vw)}.builder-preview{margin:15px auto}.builder-workspace>header{position:sticky;top:0;z-index:2}}`;
