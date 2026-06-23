import { useState, type CSSProperties } from 'react';
import type { CreateEntityKind, NsiSection, NsiSectionId, SelectedRef, TreeActionId, TreeNode } from '../../types/nsi';

interface NsiTreeProps {
  activeSection: NsiSection;
  activeSectionId: NsiSectionId;
  searchQuery: string;
  sortAscending: boolean;
  childrenByParentId: Map<string | null, TreeNode[]>;
  expandedIds: Set<string>;
  selectedRef: SelectedRef;
  pendingMoveRef: SelectedRef | null;
  onSetSearchQuery: (value: string) => void;
  onToggleSort: () => void;
  onToggleExpanded: (nodeId: string) => void;
  onSelectNode: (node: TreeNode) => void;
  onStartDrag: (node: TreeNode) => void;
  onDropOnNode: (node: TreeNode) => void;
  onCreate: (kind: CreateEntityKind, parentObjectId?: string | null) => void;
  onTreeAction: (node: TreeNode, actionId: TreeActionId) => void;
  onMoveToNode: (node: TreeNode) => void;
  onCancelMove: () => void;
}

const headerCreateOptions: Array<{ id: CreateEntityKind; label: string }> = [
  { id: 'rootObject', label: 'корневой объект' },
  { id: 'childObject', label: 'дочерний объект' },
  { id: 'room', label: 'помещение' },
  { id: 'system', label: 'система' },
  { id: 'equipment', label: 'оборудование' },
];

const rowCreateOptions: Array<{ id: CreateEntityKind; label: string }> = [
  { id: 'childObject', label: 'дочерний объект' },
  { id: 'room', label: 'помещение' },
  { id: 'system', label: 'система' },
  { id: 'equipment', label: 'оборудование' },
];

const actionOptions: Array<{ id: TreeActionId; label: string }> = [
  { id: 'add', label: 'Добавить' },
  { id: 'edit', label: 'Редактировать' },
  { id: 'move', label: 'Перенести' },
  { id: 'retire', label: 'Снять с учета' },
  { id: 'copy', label: 'Копировать' },
];

export function NsiTree({
  activeSection,
  activeSectionId,
  searchQuery,
  sortAscending,
  childrenByParentId,
  expandedIds,
  selectedRef,
  pendingMoveRef,
  onSetSearchQuery,
  onToggleSort,
  onToggleExpanded,
  onSelectNode,
  onStartDrag,
  onDropOnNode,
  onCreate,
  onTreeAction,
  onMoveToNode,
  onCancelMove,
}: NsiTreeProps) {
  const [isHeaderAddOpen, setIsHeaderAddOpen] = useState(false);
  const [isPanelMenuOpen, setIsPanelMenuOpen] = useState(false);
  const allNodes = Array.from(childrenByParentId.values()).flat();
  const selectedNode = allNodes.find((node) => node.entityKind === selectedRef.kind && node.id === selectedRef.id);
  const selectedObjectId = selectedRef.kind === 'object' ? selectedRef.id : null;
  const canCreateFromPanel = activeSectionId === 'objects' || activeSectionId === 'objectTypes';
  const canUseSelectedActions = selectedNode?.entityKind === 'object' || selectedNode?.entityKind === 'objectType';

  const runCreate = () => {
    if (activeSectionId === 'objects') {
      onCreate(selectedObjectId ? 'childObject' : 'rootObject', selectedObjectId);
      return;
    }
    if (activeSectionId === 'objectTypes' && selectedNode) onTreeAction(selectedNode, 'add');
  };

  const runSelectedAction = (actionId: TreeActionId) => {
    if (!selectedNode || !canUseSelectedActions) return;
    onTreeAction(selectedNode, actionId);
  };

  return (
    <section className="tree-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Текущий раздел</p>
          <h2>{activeSection.title}</h2>
          <span>{activeSection.description}</span>
        </div>
        <div className="panel-action-menu">
          <button type="button" className="compact-action-button" onClick={() => setIsPanelMenuOpen((value) => !value)} aria-label="Действия дерева">
            ⋯
          </button>
          {isPanelMenuOpen ? (
            <div className="action-menu panel-menu">
              <button type="button" disabled={!canCreateFromPanel} onClick={() => { runCreate(); setIsPanelMenuOpen(false); }}>
                Создать
              </button>
              <button type="button" disabled={!canUseSelectedActions} onClick={() => { runSelectedAction('retire'); setIsPanelMenuOpen(false); }}>
                Удалить
              </button>
              <button type="button" disabled={!canUseSelectedActions} onClick={() => { runSelectedAction('copy'); setIsPanelMenuOpen(false); }}>
                Копировать
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="tree-toolbar">
        <label className="search-field">
          <span>Поиск</span>
          <input value={searchQuery} onChange={(event) => onSetSearchQuery(event.target.value)} placeholder="Найти по названию, виду, сводке" />
        </label>
        <button type="button" className="ghost-button" onClick={onToggleSort}>
          {sortAscending ? 'А → Я' : 'Я → А'}
        </button>
      </div>

      {pendingMoveRef ? (
        <div className="tree-hint move-mode-hint">
          Выбран режим переноса. Нажмите Перенести сюда на нужной строке или перетащите строку мышкой.
          <button type="button" onClick={onCancelMove}>Отмена</button>
        </div>
      ) : null}

      <div className="tree-list" role="tree">
        {(childrenByParentId.get(null) ?? []).map((node) => (
          <TreeBranch
            key={node.id}
            node={node}
            depth={0}
            activeSectionId={activeSectionId}
            childrenByParentId={childrenByParentId}
            expandedIds={expandedIds}
            selectedRef={selectedRef}
            pendingMoveRef={pendingMoveRef}
            onToggle={onToggleExpanded}
            onSelect={onSelectNode}
            onDragStart={onStartDrag}
            onDropOnNode={onDropOnNode}
            onCreate={onCreate}
            onTreeAction={onTreeAction}
            onMoveToNode={onMoveToNode}
          />
        ))}
      </div>

      <footer className="tree-footer-actions">
        <button type="button" onClick={runCreate} disabled={!canCreateFromPanel}>Создать</button>
        <button type="button" className="danger-lite" onClick={() => runSelectedAction('retire')} disabled={!canUseSelectedActions}>Удалить</button>
        <button type="button" onClick={() => runSelectedAction('copy')} disabled={!canUseSelectedActions}>Копировать</button>
      </footer>
    </section>
  );
}

interface TreeBranchProps {
  node: TreeNode;
  depth: number;
  activeSectionId: NsiSectionId;
  childrenByParentId: Map<string | null, TreeNode[]>;
  expandedIds: Set<string>;
  selectedRef: SelectedRef;
  pendingMoveRef: SelectedRef | null;
  onToggle: (nodeId: string) => void;
  onSelect: (node: TreeNode) => void;
  onDragStart: (node: TreeNode) => void;
  onDropOnNode: (node: TreeNode) => void;
  onCreate: (kind: CreateEntityKind, parentObjectId?: string | null) => void;
  onTreeAction: (node: TreeNode, actionId: TreeActionId) => void;
  onMoveToNode: (node: TreeNode) => void;
}

function TreeBranch({
  node,
  depth,
  activeSectionId,
  childrenByParentId,
  expandedIds,
  selectedRef,
  pendingMoveRef,
  onToggle,
  onSelect,
  onDragStart,
  onDropOnNode,
  onCreate,
  onTreeAction,
  onMoveToNode,
}: TreeBranchProps) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const children = childrenByParentId.get(node.id) ?? [];
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedRef.kind === node.entityKind && selectedRef.id === node.id;
  const isObjectActionNode = activeSectionId === 'objects' && node.entityKind === 'object';
  const isObjectTypeActionNode = activeSectionId === 'objectTypes' && node.entityKind === 'objectType';
  const canUseActions = isObjectActionNode || isObjectTypeActionNode;
  const isMoveTarget = canUseActions && pendingMoveRef && pendingMoveRef.kind === node.entityKind && pendingMoveRef.id !== node.id;

  return (
    <div className="tree-branch" style={{ '--tree-depth': depth } as CSSProperties}>
      <div
        className={isSelected ? 'tree-row selected' : 'tree-row'}
        role="treeitem"
        aria-selected={isSelected}
        draggable={canUseActions}
        onDragStart={() => canUseActions && onDragStart(node)}
        onDragOver={(event) => canUseActions && event.preventDefault()}
        onDrop={() => canUseActions && onDropOnNode(node)}
        style={{ paddingLeft: `${depth * 18 + 10}px` }}
        onClick={() => onSelect(node)}
      >
        <button type="button" className="expand-button" onClick={(event) => { event.stopPropagation(); if (children.length > 0) onToggle(node.id); }} aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}>
          {children.length > 0 ? (isExpanded ? '▾' : '▸') : '•'}
        </button>
        <div className="tree-main"><strong>{node.title}</strong><span>{node.subtitle}</span></div>
        <div className="tree-summary">{node.summary}</div>
        {node.warning ? <span className="warning-pill">{node.warning}</span> : null}
        {isMoveTarget ? <button type="button" className="move-target-button" onClick={(event) => { event.stopPropagation(); onMoveToNode(node); }}>Перенести сюда</button> : null}
        <div className="row-menu-wrap">
          <button type="button" className="row-menu" onClick={(event) => { event.stopPropagation(); setIsActionMenuOpen((value) => !value); setIsAddMenuOpen(false); }}>⋯</button>
          {isActionMenuOpen ? (
            <div className="action-menu row-action-menu" onClick={(event) => event.stopPropagation()}>
              {actionOptions.map((option) => {
                const label = option.id === 'add' && isObjectTypeActionNode ? 'Добавить дочерний вид' : option.label;
                return <button key={option.id} type="button" disabled={!canUseActions && option.id !== 'edit'} onClick={() => { if (option.id === 'add' && isObjectActionNode) { setIsAddMenuOpen((value) => !value); return; } onTreeAction(node, option.id); setIsActionMenuOpen(false); setIsAddMenuOpen(false); }}>{label}</button>;
              })}
              {isAddMenuOpen && isObjectActionNode ? <div className="add-submenu">{rowCreateOptions.map((option) => <button key={option.id} type="button" onClick={() => { onCreate(option.id, node.id); setIsActionMenuOpen(false); setIsAddMenuOpen(false); }}>{option.label}</button>)}</div> : null}
            </div>
          ) : null}
        </div>
      </div>

      {isExpanded ? children.map((child) => <TreeBranch key={child.id} node={child} depth={depth + 1} activeSectionId={activeSectionId} childrenByParentId={childrenByParentId} expandedIds={expandedIds} selectedRef={selectedRef} pendingMoveRef={pendingMoveRef} onToggle={onToggle} onSelect={onSelect} onDragStart={onDragStart} onDropOnNode={onDropOnNode} onCreate={onCreate} onTreeAction={onTreeAction} onMoveToNode={onMoveToNode} />) : null}
    </div>
  );
}
