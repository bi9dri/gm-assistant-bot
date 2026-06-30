// 新規ステップ / セクション / 分岐枝の id 生成。
// テストで決定的な id を注入できるよう、薄いモジュール関数として切り出す
// (spyOn(ids, "generateId") でスタブする)。旧来の `<Type>-N` 連番は使わない。
export const generateId = (): string => crypto.randomUUID();
