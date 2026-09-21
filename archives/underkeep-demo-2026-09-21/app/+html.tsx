import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';
export default function Html({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#17151d" />
        <title>Underkeep — Fortune favors the depths</title>
        <meta
          name="description"
          content="A little ambition. A lot of digging. Build and manage your own pixel-art dungeon in this playable idle-game demo."
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html:
              'body{background:#17151d}*{box-sizing:border-box}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:#49404f;border-radius:6px}::-webkit-scrollbar-track{background:transparent}button:focus-visible,[role="button"]:focus-visible{outline:2px solid #e9bb70;outline-offset:3px}::selection{background:#705338;color:#fff}',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
