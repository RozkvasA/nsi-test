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
  onCreate: (kind: CreateEntityKind, parentObjectId?: string | null, contextSystemId?: string | null, parentEquipmentId?: string | null) => void;
  onTreeAction: (node: TreeNode, actionId: TreeActionId) => void;
  onMoveToNode: (node: TreeNode) => void;
  onCancelMove: () => void;
}

const headerCreateOptions: Array<{ id: CreateEntityKind; label: string }> = [
  { id: 'rootObject', label: 'корневой объект' },
  { id: 'childObject', label: 'дочерний объект' },
  { id: 'room', label: 'помещение' },
  { id: 'system', label: 'система' },
  { id: 'equipment', label: 'самостоятельное оборудование' },
];

const actionOptions: Array<{ id: TreeActionId; label: string }> = [
  { id: 'add', label: 'Добавить' },
  { id: 'edit', label: 'Открыть карточку' },
  { id: 'move', label: 'Перенести' },
  { id: 'retire', label: 'Снять с учета' },
  { id: 'copy', label: 'Копировать' },
];

export function NsiTree({ activeSection, activeSectionId, searchQuery, sortAscending, childrenByParentId, expandedIds, selectedRef, pendingMoveRef, onSetSearchQuery, onToggleSort, onToggleExpanded, onSelectNode, onStartDrag, onDropOnNode, onCreate, onTreeAction, onMoveToNode, onCancelMove }: NsiTreeProps) {
  const [isPanelMenuOpen, setIsPanelMenuOpen] = useState(false);
  const allNodes = Array.from(childrenByParentId.values()).flat();
  const selectedNode = allNodes.find((node) => node.entityKind === selectedRef.kind && (node.refId ?? node.id) === selectedRef.id);
  const selectedObjectId = selectedNode?.objectId ?? (selectedRef.kind === 'object' ? selectedRef.id : null);
  const canCreateFromPanel = activeSectionId === 'objects' || activeSectionId === 'objectTypes';
  const canUseSelectedActions = selectedNode ? canRunActionOnNode(selectedNode, activeSectionId) : false;

  const runCreate = () => {
    if (activeSectionId === 'objects') {
      if (selectedNode?.virtualRole === 'systemsFolder') { onCreate('system', selectedNode.objectId); return; }
      if (selectedNode?.virtualRole === 'roomsFolder') { onCreate('room', selectedNode.objectId); return; }
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
          <button type="button" className="compact-action-button" onClick={() => setIsPanelMenuOpen((value) => !value)} aria-label="Действия дерева">⋯</button>
          {isPanelMenuOpen ? (
            <div className="action-menu panel-menu">
              <button type="button" disabled={!canCreateFromPanel} onClick={() => { runCreate(); setIsPanelMenuOpen(false); }}>Создать</button>
              <button type="button" disabled={!canUseSelectedActions} onClick={() => { runSelectedAction('retire'); setIsPanelMenuOpen(false); }}>Удалить</button>
              <button type="button" disabled={!canUseSelectedActions} onClick={() => { runSelectedAction('copy'); setIsPanelMenuOpen(false); }}>Копировать</button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="tree-toolbar">
        <label className="search-field"><span>Поиск</span><input value={searchQuery} onChange={(event) => onSetSearchQuery(event.target.value)} placeholder="Найти по названию, виду, сводке" /></label>
        <button type="button" className="ghost-button" onClick={onToggleSort}>{sortAscending ? 'А → Я' : 'Я → А'}</button>
      </div>

      {pendingMoveRef ? <div className="tree-hint move-mode-hint">Выбран режим переноса. Нажмите Перенести сюда на нужной строке или перетащите строку мышкой.<button type="button" onClick={onCancelMove}>Отмена</button></div> : null}

      <div className="tree-list" role="tree">
        {(childrenByParentId.get(null) ?? []).map((node) => <TreeBranch key={node.id} node={node} depth={0} activeSectionId={activeSectionId} childrenByParentId={childrenByParentId} expandedIds={expandedIds} selectedRef={selectedRef} pendingMoveRef={pendingMoveRef} onToggle={onToggleExpanded} onSelect={onSelectNode} onDragStart={onStartDrag} onDropOnNode={onDropOnNode} onCreate={onCreate} onTreeAction={onTreeAction} onMoveToNode={onMoveToNode} />)}
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
  onCreate: (kind: CreateEntityKind, parentObjectId?: string | null, contextSystemId?: string | null, parentEquipmentId?: string | null) => void;
  onTreeAction: (node: TreeNode, actionId: TreeActionId) => void;
  onMoveToNode: (node: TreeNode) => void;
}

function TreeBranch({ node, depth, activeSectionId, childrenByParentId, expandedIds, selectedRef, pendingMoveRef, onToggle, onSelect, onDragStart, onDropOnNode, onCreate, onTreeAction, onMoveToNode }: TreeBranchProps) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const children = childrenByParentId.get(node.id) ?? [];
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedRef.kind === node.entityKind && selectedRef.id === (node.refId ?? node.id);
  const isObjectActionNode = activeSectionId === 'objects' && node.entityKind === 'object';
  const isObjectTypeActionNode = activeSectionId === 'objectTypes' && node.entityKind === 'objectType';
  const isFolderActionNode = activeSectionId === 'objects' && node.entityKind === 'objectFolder' && node.virtualRole !== 'emptyState' && node.virtualRole !== 'inheritedSystemsFolder';
  const isSystemActionNode = activeSectionId === 'objects' && node.entityKind === 'system' && !node.readOnly;
  const isEquipmentActionNode = activeSectionId === 'objects' && node.entityKind === 'equipment';
  const canDrag = isObjectActionNode || isObjectTypeActionNode;
  const canUseActions = canRunActionOnNode(node, activeSectionId);
  const isMoveTarget = canDrag && pendingMoveRef && pendingMoveRef.kind === node.entityKind && pendingMoveRef.id !== (node.refId ?? node.id);
  const rowClassName = ['tree-row', isSelected ? 'selected' : '', node.entityKind === 'objectFolder' ? 'virtual-folder-row' : '', node.readOnly ? 'readonly-row' : '', node.virtualRole === 'emptyState' ? 'empty-tree-row' : ''].filter(Boolean).join(' ');

  return (
    <div className="tree-branch" style={{ '--tree-depth': depth } as CSSProperties}>
      <div className={rowClassName} role="treeitem" aria-selected={isSelected} draggable={canDrag} onDragStart={() => canDrag && onDragStart(node)} onDragOver={(event) => canDrag && event.preventDefault()} onDrop={() => canDrag && onDropOnNode(node)} style={{ paddingLeft: `${depth * 18 + 10}px` }} onClick={() => onSelect(node)}>
        <button type="button" className="expand-button" onClick={(event) => { event.stopPropagation(); if (children.length > 0) onToggle(node.id); }} aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}>{children.length > 0 ? (isExpanded ? '▾' : '▸') : node.virtualRole === 'emptyState' ? '–' : '•'}</button>
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
                const disabled = option.id !== 'add' && !canUseActions;
                return <button key={option.id} type="button" disabled={disabled} onClick={() => { if (option.id === 'add' && (isObjectActionNode || isFolderActionNode || isSystemActionNode || isEquipmentActionNode)) { setIsAddMenuOpen((value) => !value); return; } onTreeAction(node, option.id); setIsActionMenuOpen(false); setIsAddMenuOpen(false); }}>{label}</button>;
              })}
              {isAddMenuOpen ? <div className="add-submenu">{getCreateOptionsForNode(node).map((option) => <button key={`${option.id}-${option.label}`} type="button" onClick={() => { onCreate(option.id, node.objectId ?? (node.entityKind === 'object' ? node.id : null), option.contextSystemId ?? (node.entityKind === 'system' ? node.refId ?? node.id : node.systemId ?? null), option.parentEquipmentId ?? (node.entityKind === 'equipment' ? node.refId ?? node.id : null)); setIsActionMenuOpen(false); setIsAddMenuOpen(false); }}>{option.label}</button>)}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
      {isExpanded ? children.map((child) => <TreeBranch key={child.id} node={child} depth={depth + 1} activeSectionId={activeSectionId} childrenByParentId={childrenByParentId} expandedIds={expandedIds} selectedRef={selectedRef} pendingMoveRef={pendingMoveRef} onToggle={onToggle} onSelect={onSelect} onDragStart={onDragStart} onDropOnNode={onDropOnNode} onCreate={onCreate} onTreeAction={onTreeAction} onMoveToNode={onMoveToNode} />) : null}
    </div>
  );
}

function canRunActionOnNode(node: TreeNode, activeSectionId: NsiSectionId) {
  if (activeSectionId === 'objectTypes') return node.entityKind === 'objectType';
  if (activeSectionId !== 'objects') return false;
  if (node.readOnly) return false;
  return node.entityKind === 'object' || node.entityKind === 'objectFolder' || node.entityKind === 'system' || node.entityKind === 'equipment';
}

function getCreateOptionsForNode(node: TreeNode): Array<{ id: CreateEntityKind; label: string; contextSystemId?: string | null; parentEquipmentId?: string | null }> {
  if (node.virtualRole === 'roomsFolder') return [{ id: 'room', label: 'Добавить помещение' }, { id: 'childObject', label: 'Добавить дочерний объект' }];
  if (node.virtualRole === 'systemsFolder') return [{ id: 'system', label: 'Добавить систему' }, { id: 'equipment', label: 'Добавить самостоятельное оборудование', contextSystemId: '' }];
  if (node.entityKind === 'system') return [{ id: 'system', label: 'Добавить подсистему', contextSystemId: node.refId ?? node.id }, { id: 'equipment', label: 'Добавить единицу оборудования', contextSystemId: node.refId ?? node.id }];
  if (node.entityKind === 'equipment') return [{ id: 'equipment', label: 'Добавить составную часть', contextSystemId: node.systemId ?? '', parentEquipmentId: node.refId ?? node.id }];
  if (node.entityKind === 'object') return headerCreateOptions.filter((option) => option.id !== 'rootObject').map((option) => ({ ...option }));
  return [];
}
