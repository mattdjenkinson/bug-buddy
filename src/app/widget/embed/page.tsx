"use client";

import dynamic from "next/dynamic";

const WidgetEmbedPage = dynamic(() => import("./widget-embed-content"), {
  ssr: false,
});

export default WidgetEmbedPage;
