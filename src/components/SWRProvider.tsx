"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

export default function SWRProvider({ children }: { children: ReactNode }) {
    return (
        <SWRConfig
            value={{
                // キャッシュの重複排除間隔を5秒に延長（デフォルト2秒）
                dedupingInterval: 5000,

                // フォーカス時の再検証を無効化（モバイル通信量削減）
                revalidateOnFocus: false,

                // オンライン復帰時のみ再検証
                revalidateOnReconnect: true,

                // フォーカス時の再検証スロットル（無効化されているが念のため）
                focusThrottleInterval: 30000,

                // エラー時の再試行を控えめに
                errorRetryCount: 2,
                errorRetryInterval: 5000,

                // ローディング時のキャッシュ保持（画面のちらつき防止）
                keepPreviousData: true,
            }}
        >
            {children}
        </SWRConfig>
    );
}
