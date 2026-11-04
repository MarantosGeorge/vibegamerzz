import { GameTable } from "./GameTable";
import { Modal } from "./Modal";
import type { GameNode } from "../lib/nesting";
import type { Game, SortDirection, SortKey } from "../types";

/**
 * A base game's DLC, opened from the folder badge on its card.
 *
 * Card view needs this because a grid cannot indent - the list view nests in
 * place instead, and the two views deliberately differ here rather than
 * pretending a grid is a tree. See docs/adr/0008.
 *
 * What it holds is a `GameTable`, not a layout of its own. That matters more
 * than it looks: a bespoke row here would be a third way of drawing a game
 * besides the card and the table row, and every column added to the library
 * from then on would have to be added to it again by hand. Reusing the table
 * means the panel already shows the storefront, the shelf, the stars, the
 * critic score, the playtime and the completion, already prints absence as a
 * dash per docs/adr/0004, and already follows the toolbar's sort.
 *
 * The nodes handed to that table have no children of their own, so no
 * disclosure triangles appear: depth is one, and a folder inside a folder is
 * not a thing this app has.
 */
interface DlcPanelProps {
  parent: Game;
  dlc: Game[];
  sort: SortKey;
  direction: SortDirection;
  onSortChange: (sort: SortKey, direction: SortDirection) => void;
  onAdd: (parent: Game) => void;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
  onClose: () => void;
}

export function DlcPanel({
  parent,
  dlc,
  sort,
  direction,
  onSortChange,
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: DlcPanelProps) {
  const nodes: GameNode[] = dlc.map((game) => ({ game, dlc: [], matched: 0 }));

  return (
    <Modal
      title={parent.title}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="button subtle" onClick={onClose}>
            Close
          </button>
          <button type="button" className="button primary" onClick={() => onAdd(parent)}>
            Add DLC
          </button>
        </>
      }
    >
      <div className="dlc-panel">
        {/* Every DLC, not just the ones that matched a filter. The badge on the
            card is what says how many matched and is therefore worth opening;
            once it is open you are looking in a folder, and a file manager
            shows you the folder. */}
        <p className="dlc-panel-count">
          {dlc.length === 1 ? "1 DLC" : `${dlc.length} DLC`} filed under this game
        </p>
        <GameTable
          nodes={nodes}
          sort={sort}
          direction={direction}
          onSortChange={onSortChange}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </Modal>
  );
}
