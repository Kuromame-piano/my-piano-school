// ピアノ教室の情報設定
// この情報は請求書・領収書に使用されます

export const SCHOOL_CONFIG = {
  // 教室名
  schoolName: "髙橋遊月ピアノ教室",

  // 先生の名前
  teacherName: "先生名",

  // 住所
  address: "〒000-0000\n東京都〇〇区〇〇 0-0-0",

  // 電話番号
  phone: "000-0000-0000",

  // メールアドレス（オプション）
  email: "example@example.com",

  // 振込先情報（請求書用）
  bankInfo: {
    bankName: "〇〇銀行",
    branchName: "〇〇支店",
    accountType: "普通",
    accountNumber: "0000000",
    accountHolder: "先生名",
  },

  // 支払期限（請求書の発行日から何日後か）
  paymentDueDays: 7,

  // 印鑑画像のパス（オプション・領収書用）
  // public/stamp.png などに配置してください
  stampImagePath: "/stamp.png",
};

// この設定を変更して、ご自身の教室情報に更新してください
