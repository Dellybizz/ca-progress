"use client";

import { CSSProperties, ReactNode } from "react";
import { AppPageElement, FeatureAccess } from "@/context/ProgressContext";
import { BuilderSection } from "@/components/page-builder/sectionRegistry";

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

export default function DynamicPageLayout({
  pageKey,
  elements,
  signedIn,
  planRank,
  isAdmin,
  featureAccess,
  children,
}: Props) {
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
        data-builder-element-key={item.element_key}
      >
        {children}
      </div>
    ) : (
      <div
        key={item.id}
        data-builder-element-key={item.element_key}
        className="dynamic-builder-section"
      >
        <BuilderSection item={item} />
      </div>
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
        .registry-section{border:1px solid;display:flex;align-items:center;gap:22px;min-width:0;overflow:hidden;box-sizing:border-box}
        .registry-section img{width:min(280px,38%);max-height:220px;object-fit:cover;border-radius:12px}
        .registry-section h2{margin:0 0 8px;font-size:22px}.registry-section p{margin:0;opacity:.78;line-height:1.6;white-space:pre-wrap}
        .registry-section a{display:inline-flex;margin-top:15px;padding:10px 16px;border-radius:9px;background:#2863c7;color:#fff;text-decoration:none;font-weight:750;font-size:12px}
        .registry-banner{border-left:4px solid #2863c7}.registry-hero{min-height:220px}
        @media(max-width:650px){.dynamic-page-layout{gap:12px}.registry-section{padding:18px!important;align-items:flex-start;flex-direction:column}.registry-section img{width:100%;max-height:200px}.registry-section h2{font-size:19px}}
      `}</style>
    </div>
  );
}
