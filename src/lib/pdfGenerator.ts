import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { SCHOOL_CONFIG } from "./schoolConfig";

interface InvoiceData {
  studentName: string;
  amount: number;
  issueDate: string;
  targetMonth?: string;
  description?: string;
  paymentType: "monthly" | "per-lesson";
}

interface ReceiptData {
  studentName: string;
  amount: number;
  issueDate: string;
  description: string;
  receiptNumber?: string;
}

// フォントデータのキャッシュ
let fontCache: string | null = null;

async function loadJapaneseFont(doc: jsPDF) {
  if (!fontCache) {
    const res = await fetch("/fonts/NotoSansJP-Regular.ttf");
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // btoa with spread causes stack overflow on large arrays, so chunk it
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    fontCache = btoa(binary);
  }
  doc.addFileToVFS("NotoSansJP-Regular.ttf", fontCache);
  doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
  doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "bold");
  doc.setFont("NotoSansJP");
}

// 請求書PDF生成
export async function generateInvoicePDF(data: InvoiceData): Promise<void> {
  const doc = new jsPDF();
  await loadJapaneseFont(doc);

  const fontName = "NotoSansJP";
  let yPos = 20;

  // ヘッダー部分をテーブルで作成
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [{ content: "請求書", styles: { fontSize: 20, halign: "center" as const } }],
    ],
    theme: "plain",
    styles: {
      font: fontName,
    },
  });

  yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : yPos + 10;

  // 発行日と請求番号
  const invoiceNumber = `INV-${new Date().getTime()}`;
  const paymentDueDate = new Date(data.issueDate);
  paymentDueDate.setDate(paymentDueDate.getDate() + SCHOOL_CONFIG.paymentDueDays);

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ["発行日", data.issueDate],
      ["請求番号", invoiceNumber],
      ["お支払期限", paymentDueDate.toLocaleDateString("ja-JP")],
    ],
    theme: "plain",
    styles: {
      font: fontName,
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30 },
      1: { cellWidth: "auto" },
    },
  });

  yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : yPos + 20;

  // 請求先
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [{ content: `${data.studentName} 様`, styles: { fontSize: 14 } }],
      ["下記の通りご請求申し上げます。"],
    ],
    theme: "plain",
    styles: {
      font: fontName,
      fontSize: 11,
      cellPadding: 2,
    },
  });

  yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : yPos + 12;

  // 請求金額（大きく表示）
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [[{ content: `ご請求金額：¥${data.amount.toLocaleString()}`, styles: { fontSize: 16, halign: "center" as const, fillColor: [240, 240, 240] } }]],
    theme: "grid",
    styles: {
      font: fontName,
      cellPadding: 5,
    },
  });

  yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : yPos + 12;

  // 請求内容
  const description = data.description || (data.paymentType === "monthly" ? `${data.targetMonth || ""}月分 レッスン料（月謝制）` : "レッスン料（都度払い）");

  autoTable(doc, {
    startY: yPos,
    head: [["項目", "金額"]],
    body: [[description, `¥${data.amount.toLocaleString()}`]],
    foot: [["合計", `¥${data.amount.toLocaleString()}`]],
    theme: "striped",
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    styles: {
      font: fontName,
      fontSize: 11,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: "right", cellWidth: "auto" },
    },
  });

  yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : yPos + 20;

  // 振込先情報
  autoTable(doc, {
    startY: yPos,
    head: [["お振込先"]],
    body: [
      ["銀行名", SCHOOL_CONFIG.bankInfo.bankName],
      ["支店名", SCHOOL_CONFIG.bankInfo.branchName],
      ["口座種別", SCHOOL_CONFIG.bankInfo.accountType],
      ["口座番号", SCHOOL_CONFIG.bankInfo.accountNumber],
      ["口座名義", SCHOOL_CONFIG.bankInfo.accountHolder],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      font: fontName,
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30 },
      1: { cellWidth: "auto" },
    },
  });

  // フッター（発行者情報）
  const bankTableEndY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : yPos;
  const footerY = bankTableEndY + 10;
  autoTable(doc, {
    startY: footerY,
    head: [],
    body: [
      [SCHOOL_CONFIG.schoolName],
      [SCHOOL_CONFIG.address.replace(/\n/g, " ")],
      [`TEL: ${SCHOOL_CONFIG.phone}`],
      [SCHOOL_CONFIG.email ? `Email: ${SCHOOL_CONFIG.email}` : ""],
    ],
    theme: "plain",
    styles: {
      font: fontName,
      fontSize: 9,
      halign: "right",
      textColor: [80, 80, 80],
    },
  });

  // PDF保存
  const filename = `請求書_${data.studentName}_${data.issueDate}.pdf`;
  doc.save(filename);
}

// 領収書PDF生成
export async function generateReceiptPDF(data: ReceiptData): Promise<void> {
  const doc = new jsPDF();
  await loadJapaneseFont(doc);

  const fontName = "NotoSansJP";
  let yPos = 20;

  // タイトル
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [{ content: "領収書", styles: { fontSize: 22, halign: "center" as const } }],
    ],
    theme: "plain",
    styles: {
      font: fontName,
    },
  });

  yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : yPos + 20;

  // 領収書番号
  const receiptNumber = data.receiptNumber || `REC-${new Date().getTime()}`;

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ["領収書番号", receiptNumber],
      ["発行日", data.issueDate],
    ],
    theme: "plain",
    styles: {
      font: fontName,
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30 },
      1: { cellWidth: "auto" },
    },
  });

  yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : yPos + 25;

  // 宛名
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [[{ content: `${data.studentName} 様`, styles: { fontSize: 16 } }]],
    theme: "plain",
    styles: {
      font: fontName,
      cellPadding: 5,
    },
  });

  yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : yPos + 15;

  // 金額（大きく枠で囲む）
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [[{ content: `¥${data.amount.toLocaleString()}`, styles: { fontSize: 24, halign: "center" as const } }]],
    theme: "grid",
    styles: {
      font: fontName,
      cellPadding: 15,
      lineWidth: 0.5,
    },
  });

  yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : yPos + 30;

  // 但し書き
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ["但し", data.description],
      ["", "上記の通り領収いたしました"],
    ],
    theme: "plain",
    styles: {
      font: fontName,
      fontSize: 11,
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 20 },
      1: { cellWidth: "auto" },
    },
  });

  yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : yPos + 30;

  // 発行者情報（右寄せ、印鑑スペースを含む）
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      [SCHOOL_CONFIG.schoolName],
      [SCHOOL_CONFIG.address.split("\n")[0]],
      [SCHOOL_CONFIG.address.split("\n")[1] || ""],
      [`TEL: ${SCHOOL_CONFIG.phone}`],
      [SCHOOL_CONFIG.email ? `Email: ${SCHOOL_CONFIG.email}` : ""],
      [""],
      [{ content: "(印)", styles: { halign: "center" as const, fontSize: 10, textColor: [120, 120, 120] } }],
    ],
    theme: "plain",
    styles: {
      font: fontName,
      fontSize: 11,
      halign: "right",
      cellPadding: 2,
    },
    margin: { left: 120 },
  });

  // 注記
  const noteY = 250;
  autoTable(doc, {
    startY: noteY,
    head: [],
    body: [
      ["※ この領収書は再発行いたしませんので、大切に保管してください。"],
    ],
    theme: "plain",
    styles: {
      font: fontName,
      fontSize: 8,
      textColor: [80, 80, 80],
    },
  });

  // PDF保存
  const filename = `領収書_${data.studentName}_${data.issueDate}.pdf`;
  doc.save(filename);
}
