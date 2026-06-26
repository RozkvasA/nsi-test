import { useState } from 'react';
import type { CreateEntityKind, DetailsNotice, DictionaryItem, EquipmentEntity, InfrastructureObject, NsiSection, NsiSectionId, ObjectStructureTemplate, ObjectType, ParameterDefinition, ParameterGroupId, ParameterGroupView, PendingEquipmentDraft, PendingObjectDraft, SelectedEntityView, SelectedRef, SystemEntity, TechCard, TreeActionId, TreeNode } from '../../types/nsi';
import { DetailsPanel } from '../details/DetailsPanel';
import { ObjectOverview } from '../overview/ObjectOverview';
import { NsiTree } from '../tree/NsiTree';

interface NsiLayoutProps {
  sections: NsiSection[]; activeSection: NsiSection; activeSectionId: NsiSectionId; isDemoMode: boolean;
  searchQuery: string; sortAscending: boolean; childrenByParentId: Map<string | null, TreeNode[]>; expandedIds: Set<string>;
  selectedRef: SelectedRef; selectedEntity: SelectedEntityView | null; pendingMoveRef: SelectedRef | null; pendingObjectDraft: PendingObjectDraft | null; pendingEquipmentDraft: PendingEquipmentDraft | null;
  activeTab: string; tabs: string[]; activeGroupId: ParameterGroupId; parameterGroups: ParameterGroupView[]; showEmpty: boolean; detailsNotice: DetailsNotice | null;
  objects: InfrastructureObject[]; objectTypes: ObjectType[]; objectStructureTemplates: ObjectStructureTemplate[]; systems: SystemEntity[]; equipment: EquipmentEntity[]; techCards: TechCard[]; dictionaries: DictionaryItem[]; selectedContextObjectId: string | null;
  onToggleDemoMode: () => void; onSelectSection: (sectionId: NsiSectionId) => void; onOpenObjectInTree: (objectId: string) => void; onCreateRootFromTemplate: () => void;
  onSetSearchQuery: (value: string) => void; onToggleSort: () => void; onToggleExpanded: (nodeId: string) => void; onSelectNode: (node: TreeNode) => void; onStartDrag: (node: TreeNode) => void; onDropOnNode: (node: TreeNode) => void;
  onCreate: (kind: CreateEntityKind, parentObjectId?: string | null, contextSystemId?: string | null, parentEquipmentId?: string | null) => void; onTreeAction: (node: TreeNode, actionId: TreeActionId) => void; onMoveToNode: (node: TreeNode) => void; onCancelMove: () => void;
  onSetActiveTab: (tab: string) => void; onSetActiveGroupId: (groupId: ParameterGroupId) => void; onSetShowEmpty: (value: boolean) => void; onDismissNotice: () => void; onConfirmRetire: () => void; onCancelRetire: () => void; onConfirmObjectTypeRetire: () => void;
  onUpdatePendingObjectDraft: (patch: Partial<PendingObjectDraft>) => void; onConfirmCreateObject: () => void; onCancelPendingObjectDraft: () => void; onCreateObjectTypeForDraft: () => void;
  onUpdatePendingEquipmentDraft: (patch: Partial<PendingEquipmentDraft>) => void; onConfirmCreateEquipment: () => void; onCancelPendingEquipmentDraft: () => void;
  onUpdateObject: (id: string, patch: Partial<InfrastructureObject>) => void; onUpdateObjectType: (id: string, patch: Partial<ObjectType>) => void; onUpdateSystem: (id: string, patch: Partial<SystemEntity>) => void; onUpdateEquipment: (id: string, patch: Partial<EquipmentEntity>) => void;
  onCreateSystemType: (systemId: string) => void; onCreateEquipmentType: (equipmentId: string) => void; onAddEquipmentToSystem: (systemId: string) => void; onAddChildEquipment: (parentEquipmentId: string) => void; onCreateMissingChildUnits: (parentEquipmentId: string) => void; onCreateChildUnitsFromRows: (parentEquipmentId: string, rows: Array<{ name: string; inventoryNumber?: string }>) => void; onRemoveChildUnits: (unitIds: string[]) => number; onDetachEquipmentFromSystem: (systemId: string, equipmentId: string) => void;
  onSelectSystem: (systemId: string, contextObjectId?: string | null) => void; onSelectEquipment: (equipmentId: string) => void; onSelectTechCard: (techCardId: string) => void; onCreateTechCardForEquipment: (equipmentId: string) => void;
  onLinkSystemToContextObject: (systemId: string) => void; onLinkSystemToRoomsInContext: (systemId: string) => void;
  onToggleAllowedChildType: (typeId: string, childTypeId: string) => void; onAddParameterGroup: (typeId: string) => void; onRenameParameterGroup: (typeId: string, groupId: string, name: string) => void; onAddParameterToGroup: (typeId: string, groupId: string) => void; onUpdateParameter: (typeId: string, parameterId: string, patch: Partial<ParameterDefinition>) => void; onDeleteParameter: (typeId: string, parameterId: string) => void;
  onToggleObjectSystemLink: (objectId: string, systemId: string) => void; onToggleEquipmentPlacement: (objectId: string, equipmentId: string) => void; onToggleSystemRoomLink: (systemId: string, roomId: string) => void; onBulkLinkRoomsToSystem: (systemId: string, roomIds: string[]) => void; onUpdateTechCard: (id: string, patch: Partial<TechCard>) => void;
}

const sectionIcons: Record<NsiSectionId, string> = { overview: '◎', objects: '▥', objectTypes: '◇', techCards: '▤', dictionaries: '☷' };

export function NsiLayout(props: NsiLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const p = props;
  const detailsPanel = <DetailsPanel {...p} />;
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="breadcrumbs" aria-label="Хлебные крошки"><span>НСИ</span><b>/</b><strong>{p.activeSection.title}</strong></div>
        <div className="topbar-right"><div className="demo-switch" title="Демо-режим сбрасывает текущие данные при переключении"><span>Демо</span><button type="button" className={p.isDemoMode ? 'active' : ''} aria-pressed={p.isDemoMode} onClick={p.onToggleDemoMode}>{p.isDemoMode ? 'вкл' : 'выкл'}</button><small>сброс данных</small></div><div className="user-block" aria-label="Пользователь"><span className="user-avatar">УК</span><div><b>Администратор</b><small>рабочее место НСИ</small></div></div></div>
      </header>
      <div className={isSidebarCollapsed ? 'app-body sidebar-collapsed' : 'app-body'}>
        <aside className={isSidebarCollapsed ? 'sidebar collapsed' : 'sidebar'}>
          <div className="brand-block"><span className="brand-mark">НСИ</span><div className="brand-text"><h1>Модуль НСИ</h1><p>исходные данные</p></div></div>
          <button type="button" className="sidebar-toggle" title={isSidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'} aria-label={isSidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'} onClick={() => setIsSidebarCollapsed((value) => !value)}>{isSidebarCollapsed ? '>' : '<'}</button>
          <nav className="section-nav" aria-label="Разделы НСИ"><span className="nav-group-title">НСИ</span>{p.sections.map((section) => <button key={section.id} type="button" className={section.id === p.activeSectionId ? 'section-button active' : 'section-button'} onClick={() => p.onSelectSection(section.id)} title={section.title}><span className="section-icon">{sectionIcons[section.id]}</span><span className="section-label">{section.title}</span><small>{section.description}</small></button>)}</nav>
        </aside>
        {p.activeSectionId === 'overview' ? <main className="work-area overview-work-area overview-only-work-area"><ObjectOverview objects={p.objects} objectTypes={p.objectTypes} systems={p.systems} equipment={p.equipment} techCards={p.techCards} onAddObject={() => { p.onSelectSection('objects'); p.onCreate('rootObject'); }} onCreateFromTemplate={() => { p.onSelectSection('objects'); p.onCreateRootFromTemplate(); }} onOpenInTree={p.onOpenObjectInTree} /></main> : <main className="work-area"><NsiTree activeSection={p.activeSection} activeSectionId={p.activeSectionId} searchQuery={p.searchQuery} sortAscending={p.sortAscending} childrenByParentId={p.childrenByParentId} expandedIds={p.expandedIds} selectedRef={p.selectedRef} pendingMoveRef={p.pendingMoveRef} onSetSearchQuery={p.onSetSearchQuery} onToggleSort={p.onToggleSort} onToggleExpanded={p.onToggleExpanded} onSelectNode={p.onSelectNode} onStartDrag={p.onStartDrag} onDropOnNode={p.onDropOnNode} onCreate={p.onCreate} onTreeAction={p.onTreeAction} onMoveToNode={p.onMoveToNode} onCancelMove={p.onCancelMove} />{detailsPanel}</main>}
      </div>
    </div>
  );
}