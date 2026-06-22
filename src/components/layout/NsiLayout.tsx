import type {
  CreateEntityKind,
  DetailsNotice,
  DictionaryItem,
  EquipmentEntity,
  InfrastructureObject,
  NsiSection,
  NsiSectionId,
  ObjectStructureTemplate,
  ObjectType,
  ParameterDefinition,
  ParameterGroupId,
  ParameterGroupView,
  PendingObjectDraft,
  SelectedEntityView,
  SelectedRef,
  SystemEntity,
  TechCard,
  TreeActionId,
  TreeNode,
} from '../../types/nsi';
import { DetailsPanel } from '../details/DetailsPanel';
import { NsiTree } from '../tree/NsiTree';

interface NsiLayoutProps {
  sections: NsiSection[];
  activeSection: NsiSection;
  activeSectionId: NsiSectionId;
  searchQuery: string;
  sortAscending: boolean;
  childrenByParentId: Map<string | null, TreeNode[]>;
  expandedIds: Set<string>;
  selectedRef: SelectedRef;
  selectedEntity: SelectedEntityView | null;
  pendingMoveRef: SelectedRef | null;
  pendingObjectDraft: PendingObjectDraft | null;
  activeTab: string;
  tabs: string[];
  activeGroupId: ParameterGroupId;
  parameterGroups: ParameterGroupView[];
  showEmpty: boolean;
  detailsNotice: DetailsNotice | null;
  objects: InfrastructureObject[];
  objectTypes: ObjectType[];
  objectStructureTemplates: ObjectStructureTemplate[];
  systems: SystemEntity[];
  equipment: EquipmentEntity[];
  techCards: TechCard[];
  dictionaries: DictionaryItem[];
  onSelectSection: (sectionId: NsiSectionId) => void;
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
  onSetActiveTab: (tab: string) => void;
  onSetActiveGroupId: (groupId: ParameterGroupId) => void;
  onSetShowEmpty: (value: boolean) => void;
  onDismissNotice: () => void;
  onConfirmRetire: () => void;
  onCancelRetire: () => void;
  onConfirmObjectTypeRetire: () => void;
  onUpdatePendingObjectDraft: (patch: Partial<PendingObjectDraft>) => void;
  onConfirmCreateObject: () => void;
  onCancelPendingObjectDraft: () => void;
  onCreateObjectTypeForDraft: () => void;
  onUpdateObject: (id: string, patch: Partial<InfrastructureObject>) => void;
  onUpdateObjectType: (id: string, patch: Partial<ObjectType>) => void;
  onToggleAllowedChildType: (typeId: string, childTypeId: string) => void;
  onAddParameterGroup: (typeId: string) => void;
  onRenameParameterGroup: (typeId: string, groupId: string, name: string) => void;
  onAddParameterToGroup: (typeId: string, groupId: string) => void;
  onUpdateParameter: (typeId: string, parameterId: string, patch: Partial<ParameterDefinition>) => void;
  onDeleteParameter: (typeId: string, parameterId: string) => void;
  onToggleObjectSystemLink: (objectId: string, systemId: string) => void;
  onToggleEquipmentPlacement: (objectId: string, equipmentId: string) => void;
  onToggleSystemRoomLink: (systemId: string, roomId: string) => void;
  onBulkLinkRoomsToSystem: (systemId: string, roomIds: string[]) => void;
  onUpdateTechCard: (id: string, patch: Partial<TechCard>) => void;
}

export function NsiLayout({
  sections,
  activeSection,
  activeSectionId,
  searchQuery,
  sortAscending,
  childrenByParentId,
  expandedIds,
  selectedRef,
  selectedEntity,
  pendingMoveRef,
  pendingObjectDraft,
  activeTab,
  tabs,
  activeGroupId,
  parameterGroups,
  showEmpty,
  detailsNotice,
  objects,
  objectTypes,
  objectStructureTemplates,
  systems,
  equipment,
  techCards,
  dictionaries,
  onSelectSection,
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
  onSetActiveTab,
  onSetActiveGroupId,
  onSetShowEmpty,
  onDismissNotice,
  onConfirmRetire,
  onCancelRetire,
  onConfirmObjectTypeRetire,
  onUpdatePendingObjectDraft,
  onConfirmCreateObject,
  onCancelPendingObjectDraft,
  onCreateObjectTypeForDraft,
  onUpdateObject,
  onUpdateObjectType,
  onToggleAllowedChildType,
  onAddParameterGroup,
  onRenameParameterGroup,
  onAddParameterToGroup,
  onUpdateParameter,
  onDeleteParameter,
  onToggleObjectSystemLink,
  onToggleEquipmentPlacement,
  onToggleSystemRoomLink,
  onBulkLinkRoomsToSystem,
  onUpdateTechCard,
}: NsiLayoutProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="breadcrumbs" aria-label="Хлебные крошки">
          <span>НСИ</span>
          <b>/</b>
          <strong>{activeSection.title}</strong>
        </div>
        <div className="user-block" aria-label="Пользователь">
          <span className="user-avatar">УК</span>
          <div>
            <b>Администратор</b>
            <small>рабочее место НСИ</small>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="brand-block">
            <span className="brand-mark">НСИ</span>
            <div>
              <h1>Модуль НСИ</h1>
              <p>исходные данные</p>
            </div>
          </div>

          <nav className="section-nav" aria-label="Разделы НСИ">
            <span className="nav-group-title">НСИ</span>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={section.id === activeSectionId ? 'section-button active' : 'section-button'}
                onClick={() => onSelectSection(section.id)}
              >
                <span>{section.title}</span>
                <small>{section.description}</small>
              </button>
            ))}
          </nav>
        </aside>

        <main className="work-area">
          <NsiTree
            activeSection={activeSection}
            activeSectionId={activeSectionId}
            searchQuery={searchQuery}
            sortAscending={sortAscending}
            childrenByParentId={childrenByParentId}
            expandedIds={expandedIds}
            selectedRef={selectedRef}
            pendingMoveRef={pendingMoveRef}
            onSetSearchQuery={onSetSearchQuery}
            onToggleSort={onToggleSort}
            onToggleExpanded={onToggleExpanded}
            onSelectNode={onSelectNode}
            onStartDrag={onStartDrag}
            onDropOnNode={onDropOnNode}
            onCreate={onCreate}
            onTreeAction={onTreeAction}
            onMoveToNode={onMoveToNode}
            onCancelMove={onCancelMove}
          />

          <DetailsPanel
            selectedRef={selectedRef}
            selectedEntity={selectedEntity}
            activeTab={activeTab}
            tabs={tabs}
            activeGroupId={activeGroupId}
            parameterGroups={parameterGroups}
            showEmpty={showEmpty}
            detailsNotice={detailsNotice}
            pendingObjectDraft={pendingObjectDraft}
            objects={objects}
            objectTypes={objectTypes}
            objectStructureTemplates={objectStructureTemplates}
            systems={systems}
            equipment={equipment}
            techCards={techCards}
            dictionaries={dictionaries}
            onSetActiveTab={onSetActiveTab}
            onSetActiveGroupId={onSetActiveGroupId}
            onSetShowEmpty={onSetShowEmpty}
            onDismissNotice={onDismissNotice}
            onConfirmRetire={onConfirmRetire}
            onCancelRetire={onCancelRetire}
            onConfirmObjectTypeRetire={onConfirmObjectTypeRetire}
            onUpdatePendingObjectDraft={onUpdatePendingObjectDraft}
            onConfirmCreateObject={onConfirmCreateObject}
            onCancelPendingObjectDraft={onCancelPendingObjectDraft}
            onCreateObjectTypeForDraft={onCreateObjectTypeForDraft}
            onUpdateObject={onUpdateObject}
            onUpdateObjectType={onUpdateObjectType}
            onToggleAllowedChildType={onToggleAllowedChildType}
            onAddParameterGroup={onAddParameterGroup}
            onRenameParameterGroup={onRenameParameterGroup}
            onAddParameterToGroup={onAddParameterToGroup}
            onUpdateParameter={onUpdateParameter}
            onDeleteParameter={onDeleteParameter}
            onToggleObjectSystemLink={onToggleObjectSystemLink}
            onToggleEquipmentPlacement={onToggleEquipmentPlacement}
            onToggleSystemRoomLink={onToggleSystemRoomLink}
            onBulkLinkRoomsToSystem={onBulkLinkRoomsToSystem}
            onUpdateTechCard={onUpdateTechCard}
          />
        </main>
      </div>
    </div>
  );
}
