import React from "react";
import { ImageResponse } from "@vercel/og";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://opcuaxkndslmejhuauyq.supabase.co";

const supabaseApiKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

export const config = {
  runtime: "edge",
};

function validSlug(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);
}

async function fetchBarbershop(slug) {
  if (!slug || !supabaseUrl || !supabaseApiKey) return null;

  const params = new URLSearchParams({
    select: "name,theme_color,logo_url",
    slug: `eq.${slug}`,
    archived_at: "is.null",
    limit: "1",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/barbershops?${params.toString()}`, {
    headers: {
      apikey: supabaseApiKey,
      authorization: `Bearer ${supabaseApiKey}`,
    },
  });

  if (!response.ok) return null;
  const data = await response.json().catch(() => []);
  return data?.[0] || null;
}

function textFromHex(hex = "#22c55e") {
  const clean = String(hex || "#22c55e").replace("#", "");
  if (clean.length !== 6) return "rgba(34, 197, 94, 0.18)";
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  if (![r, g, b].every(Number.isFinite)) return "rgba(34, 197, 94, 0.18)";
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
}

export default async function handler(request) {
  const url = new URL(request.url);
  const slug = validSlug(url.searchParams.get("slug") || "");
  const shop = await fetchBarbershop(slug);
  const brandName = String(shop?.name || "AgendaPro");
  const themeColor = String(shop?.theme_color || "#22c55e");
  const logoUrl = String(shop?.logo_url || "");
  const initials = brandName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AP";

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(160deg, #070a0d, #101418)",
          color: "#f9fafb",
          padding: "56px",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        },
      },
      React.createElement("div", {
        style: {
          position: "absolute",
          right: "-120px",
          top: "-120px",
          width: "420px",
          height: "420px",
          borderRadius: "999px",
          background: textFromHex(themeColor),
        },
      }),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "20px",
            zIndex: 1,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              width: "112px",
              height: "112px",
              borderRadius: "28px",
              border: `2px solid ${themeColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: "#101418",
              color: "#f9fafb",
              fontSize: "38px",
              fontWeight: 800,
            },
          },
          logoUrl
            ? React.createElement("img", {
                src: logoUrl,
                width: "112",
                height: "112",
                style: { objectFit: "cover" },
              })
            : initials
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "28px",
                color: "#b6bbc3",
                fontWeight: 600,
              },
            },
            "AgendaPro"
          ),
          React.createElement(
            "strong",
            {
              style: {
                fontSize: "64px",
                lineHeight: 1.02,
                maxWidth: "900px",
                letterSpacing: "0",
              },
            },
            brandName
          )
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 1,
          },
        },
        React.createElement(
          "span",
          {
            style: {
              fontSize: "34px",
              fontWeight: 700,
              color: "#f9fafb",
            },
          },
          "Agende seu horário agora"
        ),
        React.createElement(
          "span",
          {
            style: {
              border: `1px solid ${themeColor}`,
              background: textFromHex(themeColor),
              borderRadius: "999px",
              fontSize: "24px",
              fontWeight: 700,
              padding: "12px 18px",
            },
          },
          "calendarproapp.vercel.app"
        )
      )
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
