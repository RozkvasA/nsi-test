import { useState } from 'react';
import type { CreateEntityKind, NsiSection, NsiSectionId, SelectedRef, TreeActionId, TreeNode } from '../../types/nsi';

interface NsiTreeProps {
  activeSection: NsiSection;
  activeSectionId: NsiSectionId;
  searchQuery: string;
  sortAscending: boolean;
  childrenByParentId: Map<string | null, TreeNode[]>;
  expandedIds: Set<string>;
  selectedRef: SelectedRef;
  pendingMoveObjectId: string | null;
  onSetSearchQuery: (value: string) => void;
  onToggleSort: () => void;
  onToggleExpanded: (nodeId: string) => void;
  onSelectNode: (node: TreeNode) => void;
  onStartDrag: (objectId: string) => void;
  onDropOnObject: (objectId: string) => void;
  onCreate: (kind: CreateEntityKind, parentObjectId?: string | null) => void;
  onTreeAction: (node: TreeNode, actionId: TreeActionId) => void;
  onMoveToObject: (targetObjectId: string) => void;
  onCancelMove: () => void;
}

const createOptions: Array<{ id: CreateEntityKind; label: string }> = [
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
  pendingMoveObjectId,
  onSetSearchQuery,
  onToggleSort,
  onToggleExpanded,
  onSelectNode,
  onStartDrag,
  onDropOnObject,
  onCreate,
  onTreeAction,
  onMoveToObject,
  onCancelMove,
}: NsiTreeProps) {
  const [isHeaderAddOpen, setIsHeaderAddOpen] = useState(false);
  const selectedObjectId = selectedRef.kind === 'object' ? selectedRef.id : null;

  return (
    <section className="tree-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Выбранный раздел</p>
          <h2>{activeSection.title}</h2>
          <span>{activeSection.description}</span>
        </div>
        <div className="header-actions">
          <div className="action-dropdown-wrap">
            <button type="button" onClick={() => setIsHeaderAddOpen((value) => !value)} disabled={activeSectionId !== 'objects'}>
              Добавить
            </button>
            {isHeaderAddOpen && activeSectionId === 'objects' ? (
              <div className="action-menu add-menu">
                {createOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onCreate(option.id, selectedObjectId);
                      setIsHeaderAddOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => selectedObjectId && onTreeAction({ id: selectedObjectId, parentId: null, entityKind: 'object', title: '', subtitle: '', summary: '' }, 'retire')}
            disabled={activeSectionId !== 'objects' || !selectedObjectId}
          >
            Снять с учета
          </button>
          <button
            type="button"
            onClick={() => selectedObjectId && onTreeAction({ id: selectedObjectId, parentId: null, entityKind: 'object', title: '', subtitle: '', summary: '' }, 'copy')}
            disabled={activeSectionId !== 'objects' || !selectedObjectId}
          >
            Копировать
          </button>
        </div>
      </header>

      <div className="tree-toolbar">
        <label className="search-field">
          <span>Поиск</span>
          <input value={searchQuery} onChange={(event) => onSetSearchQuery(event.target.value)} placeholder="Найти по названию, виду, сводке" />
        </label>
        <button type="button" className="ghost-button" onClick={onToggleSort}>
          Сортировка: {sortAscending ? 'А → Я' : 'Я → А'}
        </button>
      </div>

      {pendingMoveObjectId ? (
        <div className="tree-hint move-mode-hint">
          Выбран режим переноса. Нажмите Перенести сюда на нужном объекте или перетащите строку мышкой.
          <button type="button" onClick={onCancelMove}>
            Отмена
          </button>
        </div>
      ) : (
        <div className="tree-hint">Строки дерева свернуты по умолчанию. Для объектов доступен перенос drag and drop без переноса внутрь самого себя.</div>
      )}

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
            pendingMoveObjectId={pendingMoveObjectId}
            onToggle={onToggleExpanded}
            onSelect={onSelectNode}
            onDragStart={onStartDrag}
            onDropOnObject={onDropOnObject}
            onCreate={onCreate}
            onTreeAction={onTreeAction}
            onMoveToObject={onMoveToObject}
          />
        ))}
      </div>
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
  pendingMoveObjectId: string | null;
  onToggle: (nodeId: string) => void;
  onSelect: (node: TreeNode) => void;
  onDragStart: (objectId: string) => void;
  onDropOnObject: (objectId: string) => void;
  onCreate: (kind: CreateEntityKind, parentObjectId?: string | null) => void;
  onTreeAction: (node: TreeNode, actionId: TreeActionId) => void;
  onMoveToObject: (targetObjectId: string) => void;
}

function TreeBranch({
  node,
  depth,
  activeSectionId,
  childrenByParentId,
  expandedIds,
  selectedRef,
  pendingMoveObjectId,
  onToggle,
  onSelect,
  onDragStart,
  onDropOnObject,
  onCreate,
  onTreeAction,
  onMoveToObject,
}: TreeBranchProps) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const children = childrenByParentId.get(node.id) ?? [];
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedRef.kind === node.entityKind && selectedRef.id === node.id;
  const isObject = node.entityKind === 'object';
  const canUseObjectActions = activeSectionId === 'objects' && isObject;
  const isMoveTarget = canUseObjectActions && pendingMoveObjectId && pendingMoveObjectId !== node.id;

  return (
    <div className="tree-branch">
      <div
        className={isSelected ? 'tree-row selected' : 'tree-row'}
        role="treeitem"
        aria-selected={isSelected}
        draggable={canUseObjectActions}
        onDragStart={() => canUseObjectActions && onDragStart(node.id)}
        onDragOver={(event) => canUseObjectActions && event.preventDefault()}
        onDrop={() => canUseObjectActions && onDropOnObject(node.id)}
        style={{ paddingLeft: `${depth * 18 + 10}px` }}
        onClick={() => onSelect(node)}
      >
        <button
          type="button"
          className="expand-button"
          onClick={(event) => {
            event.stopPropagation();
            if (children.length > 0) onToggle(node.id);
          }}
          aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
        >
          {children.length > 0 ? (isExpanded ? '▾' : '▸') : '•'}
        </button>
        <div className="tree-main">
          <strong>{node.title}</strong>
          <span>{node.subtitle}</span>
        </div>
        <div className="tree-summary">{node.summary}</div>
        {node.warning ? <span className="warning-pill">{node.warning}</span> : null}
        {isMoveTarget ? (
          <button
            type="button"
            className="move-target-button"
            onClick={(event) => {
              event.stopPropagation();
              onMoveToObject(node.id);
            }}
          >
            Перенести сюда
          </button>
        ) : null}
        <div className="row-menu-wrap">
          <button
            type="button"
            className="row-menu"
            onClick={(event) => {
              event.stopPropagation();
              setIsActionMenuOpen((value) => !value);
              setIsAddMenuOpen(false);
            }}
          >
            ⋯
          </button>
          {isActionMenuOpen ? (
            <div className="action-menu row-action-menu" onClick={(event) => event.stopPropagation()}>
              {actionOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={!canUseObjectActions && option.id !== 'edit'}
                  onClick={() => {
                    if (option.id === 'add') {
                      setIsAddMenuOpen((value) => !value);
                      return;
                    }
                    onTreeAction(node, option.id);
                    setIsActionMenuOpen(false);
                    setIsAddMenuOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
              {isAddMenuOpen ? (
                <div className="add-submenu">
                  {createOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onCreate(option.id, node.id);
                        setIsActionMenuOpen(false);
                        setIsAddMenuOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {isExpanded
        ? children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              activeSectionId={activeSectionId}
              childrenByParentId={childrenByParentId}
              expandedIds={expandedIds}
              selectedRef={selectedRef}
              pendingMoveObjectId={pendingMoveObjectId}
              onToggle={onToggle}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDropOnObject={onDropOnObject}
              onCreate={onCreate}
              onTreeAction={onTreeAction}
              onMoveToObject={onMoveToObject}
            />
          ))
        : null}
    </div>
  );
}
