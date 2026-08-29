"use client";

import { CSSProperties, ReactNode } from "react";
import { AppPageElement, FeatureAccess } from "@/context/ProgressContext";

type Props = {
  pageKey: string;
  elements: AppPageElement[];
  signedIn: boolean;
  planRank: number;
  isAdmin: boolean;
  featureAccess: Record<string, FeatureAccess>;
  children: ReactNode;
};

const isVisible = (
  item: AppPageElement,
  signedIn: boolean,
  planRank: number,
  isAdmin: boolean,
  featureAccess: Record<string, FeatureAccess>,
) => {
  if (isAdmin) return true;
  if (!item.enabled) return false;
  if (item.audience === "guest" && signedIn) return false;
  if (item.audience === "member" && !signedIn) return false;
  if (
    item.minimum_plan_rank > 0 &&
    (!signedIn || planRank < item.minimum_plan_rank)
  )
    return false;
  const featureKey = String(item.config?.featureKey || "");
  if (featureKey && featureAccess[featureKey]?.allowed === false) return false;
  return true;
};

const styleFor = (item: AppPageElement): CSSProperties => ({
  background: String(item.appearance?.backgroundColor || "#ffffff"),
  color: String(item.appearance?.textColor || "#1d2939"),
  borderColor: String(item.appearance?.borderColor || "#e2e8f0"),
  borderRadius: `${Number(item.appearance?.borderRadius ?? 16)}px`,
  padding: `${Number(item.appearance?.padding ?? 22)}px`,
  textAlign:
    (item.appearance?.alignment as CSSProperties["textAlign"]) || "left",
});

function ConfigurableBlock({ item }: { item: AppPageElement }) {
  const variant = String(item.config?.variant || "text");
  const buttonLabel = String(item.config?.buttonLabel || "");
  const route = String(item.config?.route || "");
  const imageUrl = String(item.config?.imageUrl || "");

  if (variant === "spacer") {
    return (
      <div aria-hidden style={{ height: Number(item.config?.height || 24) }} />
    );
  }

  return (
    <section
      className={`dynamic-page-block dynamic-page-block--${variant}`}
      style={styleFor(item)}
    >
      {imageUrl && <img src={imageUrl} alt="" />}
      <div>
        {item.label && <h2>{item.label}</h2>}
        {item.description && <p>{item.description}</p>}
        {buttonLabel && route && <a href={route}>{buttonLabel}</a>}
      </div>
    </section>
  );
}

export default function DynamicPageLayout({
  pageKey,
  elements,
  signedIn,
  planRank,
  isAdmin,
  featureAccess,
  children,
}: Props) {
  if (pageKey === "dashboard") return <>{children}</>;

  const allPageItems = elements.filter((item) => item.page_key === pageKey);
  const pageItems = allPageItems
    .filter((item) =>
      isVisible(item, signedIn, planRank, isAdmin, featureAccess),
    )
    .sort((a, b) => a.sort_order - b.sort_order);

  // Existing installations without page-builder seeds keep their normal view.
  if (!allPageItems.length) return <>{children}</>;

  const output = pageItems.map((item) =>
    item.element_key === "native-content" ? (
      <div
        className="dynamic-native-section"
        style={styleFor(item)}
        key={item.id}
      >
        {children}
      </div>
    ) : (
      <ConfigurableBlock item={item} key={item.id} />
    ),
  );

  // Never make a page blank because an older database lacks the native record.
  if (!allPageItems.some((item) => item.element_key === "native-content")) {
    output.push(<div key="native-fallback">{children}</div>);
  }

  return (
    <div className="dynamic-page-layout">
      {output}
      <style>{`
        .dynamic-page-layout{display:flex;flex-direction:column;gap:16px;min-width:0}
        .dynamic-native-section{min-width:0;background:transparent!important;color:inherit!important;border-color:transparent!important;padding:0!important}
        .dynamic-page-block{border:1px solid;display:flex;align-items:center;gap:18px;min-width:0;overflow:hidden}
        .dynamic-page-block img{width:min(180px,32%);max-height:140px;object-fit:cover;border-radius:12px}
        .dynamic-page-block h2{margin:0 0 7px;font-size:20px}
        .dynamic-page-block p{margin:0;opacity:.78;line-height:1.6;white-space:pre-wrap}
        .dynamic-page-block a{display:inline-flex;margin-top:14px;padding:10px 15px;border-radius:9px;background:#2863c7;color:#fff;text-decoration:none;font-weight:750;font-size:12px}
        .dynamic-page-block--notice{border-left:4px solid #2863c7}
        .dynamic-page-block--hero{min-height:180px}
        @media(max-width:650px){.dynamic-page-layout{gap:12px}.dynamic-page-block{padding:16px!important;align-items:flex-start;flex-direction:column}.dynamic-page-block img{width:100%;max-height:180px}.dynamic-page-block h2{font-size:17px}}
      `}</style>
    </div>
  );
}
