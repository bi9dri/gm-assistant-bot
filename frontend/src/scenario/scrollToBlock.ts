// ブロック行 (BlockList / RunnerBlockList が id="block-{id}" で描画する) へスクロールする。
// 目次のクリックと実行モードのカーソル追従が共有する。
export const scrollToBlock = (id: string): void => {
  const target = document.getElementById(`block-${id}`);
  if (target === null) return;
  // 畳まれた見出しの中にある行は箱を持たず scrollIntoView が効かない。祖先の
  // <details> を開いてから飛ぶ (open の変更は toggle イベント経由で state にも届く)。
  for (
    let details = target.parentElement?.closest("details");
    details != null;
    details = details.parentElement?.closest("details") ?? null
  ) {
    details.open = true;
  }
  target.scrollIntoView({ behavior: "smooth", block: "start" });
};
