import { useMemo, useState } from 'react';
import {
  dictionaries as initialDictionaries,
  equipment as initialEquipment,
  infrastructureObjects as initialObjects,
  nsiSections,
  objectTypes,
  systems as initialSystems,
  techCards as initialTechCards,
} from './data/nsiDemoData';
import type {
  DictionaryItem,
  EntityKind,
  EquipmentEntity,
  InfrastructureObject,
  NsiSectionId,
  ObjectType,
  SystemEntity,
  TechCard,
  TreeNode,
} from './types/nsi';

type SelectedRef = {
  kind: EntityKind;
  id: string;
};

type ParameterGroupId = 'main' | 'relations' | 'additional';

const tabs = ['Параметры', 'Документы', 'Заметки', 'Карта', 'Обслуживание'];

const parameterGroups: Array<{ id: ParameterGroupId; title: string; hint: string }> = [
  { id: 'main', title: 'Основные', hint: 'Идентификатор, наименование, вид, родитель, площадь и количество' },
  { id: 'relations', title: 'Связи', hint: 'Двусторонние связи через чекбоксы и массовый выбор' },
  { id: 'additional', title: 'Прочие', hint: 'Параметры по виду объекта и служебные признаки' },
];

const formatArea = (area: number | null) => (area === null ? 'площадь не заполнена' : `${area.toLocaleString('ru-RU')} м²`);

const isRoomType = (typeId: string) => objectTypes.find((type) => type.id === typeId)?.code === 'ROOM';

const buildDescendantIds = (objects: InfrastructureObject[], rootId: string): string[] => {
  const children = objects.filter((item) => item.parentId === rootId);
  return children.flatMap((child) => [child.id, ...buildDescendantIds(objects, child.id)]);
};

function App() {
  const [activeSectionId, setActiveSectionId] = useState<NsiSectionId>('objects');
  const [objects, setObjects] = useState<InfrastructureObject[]>(initialObjects);
  const [systems, setSystems] = useState<SystemEntity[]>(initialSystems);
  const [equipment, setEquipment] = useState<EquipmentEntity[]>(initialEquipment);
  const [techCards, setTechCards] = useState<TechCard[]>(initialTechCards);
  const [dictionaries] = useState<DictionaryItem[]>(initialDictionaries);
  const [selectedRef, setSelectedRef] = useState<SelectedRef>({ kind: 'object', id: 'obj-root' });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAscending, setSortAscending] = useState(true);
  const [activeTab, setActiveTab] = useState('Параметры');
  const [activeGroupId, setActiveGroupId] = useState<ParameterGroupId>('main');
  const [showEmpty, setShowEmpty] = useState(true);
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);

  const activeSection = nsiSections.find((section) => section.id === activeSectionId) ?? nsiSections[0];

  const treeNodes = useMemo(
    () => buildTreeNodes(activeSectionId, objects, systems, equipment, techCards, dictionaries),
    [activeSectionId, objects, systems, equipment, techCards, dictionaries],
  );

  const filteredTreeNodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return treeNodes;

    const nodesById = new Map(treeNodes.map((node) => [node.id, node]));
    const visibleIds = new Set<string>();

    treeNodes.forEach((node) => {
      const haystack = `${node.title} ${node.subtitle} ${node.summary}`.toLowerCase();
      if (!haystack.includes(query)) return;

      visibleIds.add(node.id);
      let parentId = node.parentId;
      while (parentId) {
        visibleIds.add(parentId);
        parentId = nodesById.get(parentId)?.parentId ?? null;
      }
    });

    return treeNodes.filter((node) => visibleIds.has(node.id));
  }, [searchQuery, treeNodes]);

  const childrenByParentId = useMemo(() => {
    const map = new Map<string | null, TreeNode[]>();
    filteredTreeNodes.forEach((node) => {
      const siblings = map.get(node.parentId) ?? [];
      siblings.push(node);
      map.set(node.parentId, siblings);
    });

    map.forEach((siblings) => {
      siblings.sort((a, b) =>
        sortAscending ? a.title.localeCompare(b.title, 'ru') : b.title.localeCompare(a.title, 'ru'),
      );
    });

    return map;
  }, [filteredTreeNodes, sortAscending]);

  const selectedEntity = useMemo(
    () => resolveSelectedEntity(selectedRef, objects, systems, equipment, techCards, dictionaries),
    [selectedRef, objects, systems, equipment, techCards, dictionaries],
  );

  const selectSection = (sectionId: NsiSectionId) => {
    const nextKindBySection: Record<NsiSectionId, EntityKind> = {
      objects: 'object',
      objectTypes: 'objectType',
      techCards: 'techCard',
      dictionaries: 'dictionary',
    };

    const nextNodes = buildTreeNodes(sectionId, objects, systems, equipment, techCards, dictionaries);
    setActiveSectionId(sectionId);
    setSelectedRef({ kind: nextKindBySection[sectionId], id: nextNodes[0]?.id ?? '' });
    setActiveTab('Параметры');
    setActiveGroupId('main');
    setSearchQuery('');
    setExpandedIds(new Set());
  };

  const toggleExpanded = (nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleSelectNode = (node: TreeNode) => {
    setSelectedRef({ kind: node.entityKind, id: node.id });
    setActiveTab('Параметры');
    setActiveGroupId('main');
  };

  const handleCreateChildObject = () => {
    const parentId = selectedRef.kind === 'object' ? selectedRef.id : null;
    const parent = objects.find((item) => item.id === parentId);
    const id = `obj-${Date.now()}`;

    setObjects((prev) => [
      ...prev,
      {
        id,
        name: 'Новый объект учета',
        shortName: 'Новый',
        typeId: parent && isRoomType(parent.typeId) ? 'type-equipment' : 'type-room',
        parentId,
        area: null,
        quantity: 1,
        unit: 'ед.',
        status: 'active',
        parameters: {},
      },
    ]);
    setSelectedRef({ kind: 'object', id });
    if (parentId) setExpandedIds((prev) => new Set(prev).add(parentId));
  };

  const handleCopyObject = () => {
    if (selectedRef.kind !== 'object') return;
    const source = objects.find((item) => item.id === selectedRef.id);
    if (!source) return;

    const id = `obj-copy-${Date.now()}`;
    setObjects((prev) => [
      ...prev,
      {
        ...source,
        id,
        name: `${source.name} копия`,
        shortName: `${source.shortName} коп.`,
      },
    ]);
    setSelectedRef({ kind: 'object', id });
  };

  const handleRetireObject = () => {
    if (selectedRef.kind !== 'object') return;
    const selectedObject = objects.find((item) => item.id === selectedRef.id);
    if (!selectedObject) return;

    const descendants = buildDescendantIds(objects, selectedObject.id);
    const affectedObjectIds = [selectedObject.id, ...descendants];
    const affectedSystems = systems.filter(
      (system) =>
        system.scopeObjectIds.some((id) => affectedObjectIds.includes(id)) ||
        system.linkedRoomIds.some((id) => affectedObjectIds.includes(id)),
    ).length;
    const affectedEquipment = equipment.filter((item) => affectedObjectIds.includes(item.placementObjectId)).length;
    const affectedTechCards = techCards.filter((card) => affectedObjectIds.includes(card.targetId)).length;

    const approved = window.confirm(
      `Снять с учета ${selectedObject.name}? Будет затронуто: дочерних элементов ${descendants.length}, систем ${affectedSystems}, оборудования ${affectedEquipment}, техкарт ${affectedTechCards}.`,
    );

    if (!approved) return;
    setObjects((prev) =>
      prev.map((item) => (affectedObjectIds.includes(item.id) ? { ...item, status: 'retired' } : item)),
    );
  };

  const handleDropOnObject = (targetId: string) => {
    if (!draggedObjectId || draggedObjectId === targetId) return;

    const descendants = buildDescendantIds(objects, draggedObjectId);
    if (descendants.includes(targetId)) {
      window.alert('Нельзя перенести элемент внутрь самого себя или собственного дочернего элемента.');
      return;
    }

    setObjects((prev) => prev.map((item) => (item.id === draggedObjectId ? { ...item, parentId: targetId } : item)));
    setDraggedObjectId(null);
    setExpandedIds((prev) => new Set(prev).add(targetId));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">НСИ</span>
          <div>
            <h1>Модуль НСИ</h1>
            <p>универсальная база исходных данных</p>
          </div>
        </div>

        <nav className="section-nav" aria-label="Разделы НСИ">
          {nsiSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === activeSectionId ? 'section-button active' : 'section-button'}
              onClick={() => selectSection(section.id)}
            >
              <span>{section.title}</span>
              <small>{section.description}</small>
            </button>
          ))}
        </nav>
      </aside>

      <main className="work-area">
        <section className="tree-panel">
          <header className="panel-header">
            <div>
              <p className="eyebrow">Выбранный раздел</p>
              <h2>{activeSection.title}</h2>
              <span>{activeSection.description}</span>
            </div>
            <div className="header-actions">
              <button type="button" onClick={handleCreateChildObject} disabled={activeSectionId !== 'objects'}>
                Создать
              </button>
              <button type="button" onClick={handleRetireObject} disabled={activeSectionId !== 'objects'}>
                Снять с учета
              </button>
              <button type="button" onClick={handleCopyObject} disabled={activeSectionId !== 'objects'}>
                Копировать
              </button>
            </div>
          </header>

          <div className="tree-toolbar">
            <label className="search-field">
              <span>Поиск</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Найти по названию, виду, сводке"
              />
            </label>
            <button type="button" className="ghost-button" onClick={() => setSortAscending((value) => !value)}>
              Сортировка: {sortAscending ? 'А → Я' : 'Я → А'}
            </button>
          </div>

          <div className="tree-hint">
            Строки дерева свернуты по умолчанию. Для объектов доступен перенос drag and drop без переноса внутрь самого себя.
          </div>

          <div className="tree-list" role="tree">
            {(childrenByParentId.get(null) ?? []).map((node) => (
              <TreeBranch
                key={node.id}
                node={node}
                depth={0}
                childrenByParentId={childrenByParentId}
                expandedIds={expandedIds}
                selectedRef={selectedRef}
                onToggle={toggleExpanded}
                onSelect={handleSelectNode}
                onDragStart={setDraggedObjectId}
                onDropOnObject={handleDropOnObject}
              />
            ))}
          </div>
        </section>

        <section className="details-panel">
          <header className="details-header">
            <p className="eyebrow">Карточка элемента</p>
            <h2>{selectedEntity?.title ?? 'Элемент не выбран'}</h2>
            <span>{selectedEntity?.subtitle ?? 'Выберите строку в дереве'}</span>
          </header>

          <div className="tabs">
            {tabs.map((tab) => (
              <button key={tab} type="button" className={tab === activeTab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Параметры' ? (
            <div className="parameters-layout">
              <aside className="parameter-groups">
                <div className="toggle-row">
                  <span>Показать пустые</span>
                  <label className="switch">
                    <input type="checkbox" checked={showEmpty} onChange={(event) => setShowEmpty(event.target.checked)} />
                    <span />
                  </label>
                </div>
                {parameterGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className={group.id === activeGroupId ? 'group-button active' : 'group-button'}
                    onClick={() => setActiveGroupId(group.id)}
                  >
                    <b>{group.title}</b>
                    <small>{group.hint}</small>
                  </button>
                ))}
              </aside>

              <div className="parameter-card">
                <ParameterContent
                  selectedRef={selectedRef}
                  selectedEntity={selectedEntity}
                  activeGroupId={activeGroupId}
                  showEmpty={showEmpty}
                  objects={objects}
                  systems={systems}
                  equipment={equipment}
                  techCards={techCards}
                  dictionaries={dictionaries}
                  onUpdateObject={(id, patch) =>
                    setObjects((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
                  }
                  onToggleObjectSystemLink={(objectId, systemId) => {
                    setSystems((prev) =>
                      prev.map((system) => {
                        if (system.id !== systemId) return system;
                        const targetObject = objects.find((item) => item.id === objectId);
                        const roomLink = system.linkedRoomIds.includes(objectId);
                        const scopeLink = system.scopeObjectIds.includes(objectId);

                        if (targetObject && isRoomType(targetObject.typeId)) {
                          return {
                            ...system,
                            linkedRoomIds: roomLink
                              ? system.linkedRoomIds.filter((id) => id !== objectId)
                              : [...system.linkedRoomIds, objectId],
                          };
                        }

                        return {
                          ...system,
                          scopeObjectIds: scopeLink
                            ? system.scopeObjectIds.filter((id) => id !== objectId)
                            : [...system.scopeObjectIds, objectId],
                        };
                      }),
                    );
                  }}
                  onToggleEquipmentPlacement={(objectId, equipmentId) => {
                    setEquipment((prev) =>
                      prev.map((item) => (item.id === equipmentId ? { ...item, placementObjectId: objectId } : item)),
                    );
                  }}
                  onToggleSystemRoomLink={(systemId, roomId) => {
                    setSystems((prev) =>
                      prev.map((system) => {
                        if (system.id !== systemId) return system;
                        const exists = system.linkedRoomIds.includes(roomId);
                        return {
                          ...system,
                          linkedRoomIds: exists
                            ? system.linkedRoomIds.filter((id) => id !== roomId)
                            : [...system.linkedRoomIds, roomId],
                        };
                      }),
                    );
                  }}
                  onBulkLinkRoomsToSystem={(systemId, roomIds) => {
                    setSystems((prev) =>
                      prev.map((system) =>
                        system.id === systemId ? { ...system, linkedRoomIds: Array.from(new Set([...system.linkedRoomIds, ...roomIds])) } : system,
                      ),
                    );
                  }}
                  onUpdateTechCard={(id, patch) =>
                    setTechCards((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
                  }
                />
              </div>
            </div>
          ) : (
            <div className="stub-tab">
              <h3>{activeTab}</h3>
              <p>Раздел оставлен как заглушка этапа 1. Каркас вкладки есть, детальная логика будет подключаться следующими этапами.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

interface TreeBranchProps {
  node: TreeNode;
  depth: number;
  childrenByParentId: Map<string | null, TreeNode[]>;
  expandedIds: Set<string>;
  selectedRef: SelectedRef;
  onToggle: (nodeId: string) => void;
  onSelect: (node: TreeNode) => void;
  onDragStart: (objectId: string) => void;
  onDropOnObject: (objectId: string) => void;
}

function TreeBranch({
  node,
  depth,
  childrenByParentId,
  expandedIds,
  selectedRef,
  onToggle,
  onSelect,
  onDragStart,
  onDropOnObject,
}: TreeBranchProps) {
  const children = childrenByParentId.get(node.id) ?? [];
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedRef.kind === node.entityKind && selectedRef.id === node.id;
  const isObject = node.entityKind === 'object';

  return (
    <div className="tree-branch">
      <div
        className={isSelected ? 'tree-row selected' : 'tree-row'}
        role="treeitem"
        aria-selected={isSelected}
        draggable={isObject}
        onDragStart={() => isObject && onDragStart(node.id)}
        onDragOver={(event) => isObject && event.preventDefault()}
        onDrop={() => isObject && onDropOnObject(node.id)}
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
        <button type="button" className="row-menu" onClick={(event) => event.stopPropagation()}>
          ⋯
        </button>
      </div>

      {isExpanded
        ? children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              childrenByParentId={childrenByParentId}
              expandedIds={expandedIds}
              selectedRef={selectedRef}
              onToggle={onToggle}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDropOnObject={onDropOnObject}
            />
          ))
        : null}
    </div>
  );
}

interface ParameterContentProps {
  selectedRef: SelectedRef;
  selectedEntity: ReturnType<typeof resolveSelectedEntity>;
  activeGroupId: ParameterGroupId;
  showEmpty: boolean;
  objects: InfrastructureObject[];
  systems: SystemEntity[];
  equipment: EquipmentEntity[];
  techCards: TechCard[];
  dictionaries: DictionaryItem[];
  onUpdateObject: (id: string, patch: Partial<InfrastructureObject>) => void;
  onToggleObjectSystemLink: (objectId: string, systemId: string) => void;
  onToggleEquipmentPlacement: (objectId: string, equipmentId: string) => void;
  onToggleSystemRoomLink: (systemId: string, roomId: string) => void;
  onBulkLinkRoomsToSystem: (systemId: string, roomIds: string[]) => void;
  onUpdateTechCard: (id: string, patch: Partial<TechCard>) => void;
}

function ParameterContent({
  selectedRef,
  selectedEntity,
  activeGroupId,
  showEmpty,
  objects,
  systems,
  equipment,
  techCards,
  dictionaries,
  onUpdateObject,
  onToggleObjectSystemLink,
  onToggleEquipmentPlacement,
  onToggleSystemRoomLink,
  onBulkLinkRoomsToSystem,
  onUpdateTechCard,
}: ParameterContentProps) {
  if (!selectedEntity) return <EmptyState title="Элемент не выбран" description="Выберите строку в центральном дереве." />;

  if (selectedRef.kind === 'object') {
    const object = objects.find((item) => item.id === selectedRef.id);
    if (!object) return null;

    const objectType = objectTypes.find((type) => type.id === object.typeId);
    const parent = objects.find((item) => item.id === object.parentId);
    const roomsInBranch = objects.filter((item) => isRoomType(item.typeId));
    const linkedEquipment = equipment.filter((item) => item.placementObjectId === object.id);
    const linkedTechCards = techCards.filter((item) => item.targetId === object.id);

    if (activeGroupId === 'relations') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Связи объекта учета" description="Системы и оборудование не хранятся строками внутри помещения. Связи редактируются отдельно и остаются двусторонними." />
          <RelationBlock
            title="Связанные системы"
            description="Для помещения меняется linkedRoomIds, для другого узла дерева меняется scopeObjectIds. Глобальная система не дублируется ниже."
            items={systems.map((system) => ({
              id: system.id,
              label: system.name,
              checked: system.linkedRoomIds.includes(object.id) || system.scopeObjectIds.includes(object.id),
            }))}
            onToggle={(id) => onToggleObjectSystemLink(object.id, id)}
          />
          <RelationBlock
            title="Связанное оборудование"
            description="Оборудование остается отдельной сущностью и хранит placementObjectId."
            items={equipment.map((item) => ({
              id: item.id,
              label: item.name,
              checked: item.placementObjectId === object.id,
            }))}
            onToggle={(id) => onToggleEquipmentPlacement(object.id, id)}
            singleChoice
          />
          <div className="bulk-panel">
            <b>Массовая привязка</b>
            <p>Для выбранного объекта можно привязать систему ко всем помещениям ветки. Сейчас показан каркас действия для будущего этапа связей.</p>
            <button
              type="button"
              onClick={() => systems[0] && onBulkLinkRoomsToSystem(systems[0].id, roomsInBranch.map((room) => room.id))}
            >
              Привязать первую систему ко всем помещениям
            </button>
          </div>
        </div>
      );
    }

    if (activeGroupId === 'additional') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Прочие параметры по виду объекта" description="Поля берутся из вида объекта и не завязаны на конкретный тип недвижимости." />
          <KeyValueList
            showEmpty={showEmpty}
            rows={Object.entries(object.parameters).map(([key, value]) => ({ label: key, value }))}
          />
          <InfoGrid
            items={[
              { label: 'Связанных техкарт', value: linkedTechCards.length },
              { label: 'Размещенного оборудования', value: linkedEquipment.length },
              { label: 'Статус учета', value: object.status === 'active' ? 'На учете' : 'Снят с учета' },
            ]}
          />
        </div>
      );
    }

    return (
      <div className="parameter-section">
        <SectionTitle title="Основные параметры" description="Редактирование выполняется в правой карточке, без модального окна поверх интерфейса." />
        <EditableField label="Идентификатор" value={object.id} readOnly />
        <EditableField label="Наименование" value={object.name} onChange={(value) => onUpdateObject(object.id, { name: value })} />
        <EditableField label="Сокращение" value={object.shortName} onChange={(value) => onUpdateObject(object.id, { shortName: value })} />
        <EditableField label="Вид объекта" value={objectType?.name ?? ''} readOnly empty={!objectType} showEmpty={showEmpty} />
        <EditableField label="Родительский объект" value={parent?.name ?? ''} readOnly empty={!parent} showEmpty={showEmpty} />
        <EditableField
          label="Площадь"
          value={object.area ?? ''}
          type="number"
          empty={object.area === null}
          showEmpty={showEmpty}
          onChange={(value) => onUpdateObject(object.id, { area: value === '' ? null : Number(value) })}
        />
        <EditableField
          label="Количество"
          value={object.quantity}
          type="number"
          onChange={(value) => onUpdateObject(object.id, { quantity: Number(value) })}
        />
        <EditableField label="Единица измерения" value={object.unit} onChange={(value) => onUpdateObject(object.id, { unit: value })} />
      </div>
    );
  }

  if (selectedRef.kind === 'objectType') {
    const type = objectTypes.find((item) => item.id === selectedRef.id);
    if (!type) return null;
    const parent = objectTypes.find((item) => item.id === type.parentTypeId);

    if (activeGroupId === 'relations') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Дочерние виды и правила создания" description="Дерево видов является справочником и шаблоном, а не жестким ограничителем." />
          <InfoGrid
            items={[
              { label: 'Родительский вид', value: parent?.name ?? 'Нет' },
              { label: 'Разрешено создавать', value: type.canCreateObjects ? 'Да' : 'Нет' },
              { label: 'Разрешено редактировать', value: type.canEditObjects ? 'Да' : 'Нет' },
              { label: 'Разрешено снимать с учета', value: type.canRetireObjects ? 'Да' : 'Нет' },
            ]}
          />
          <TagList title="Допустимые дочерние виды" tags={type.allowedChildTypeIds.map((id) => objectTypes.find((item) => item.id === id)?.name ?? id)} />
        </div>
      );
    }

    if (activeGroupId === 'additional') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Группы параметров" description="На следующих этапах эти группы будут управлять карточками объектов." />
          {type.parameterGroups.map((group) => (
            <div className="mini-card" key={group.id}>
              <b>{group.name}</b>
              <p>{group.parameterIds.join(', ')}</p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="parameter-section">
        <SectionTitle title="Основные параметры вида" description="Вид объекта хранит код, сокращение, иконку и правила шаблона." />
        <EditableField label="Идентификатор" value={type.id} readOnly />
        <EditableField label="Наименование" value={type.name} readOnly />
        <EditableField label="Код" value={type.code} readOnly />
        <EditableField label="Сокращение" value={type.shortName} readOnly />
        <EditableField label="Иконка" value={type.icon} readOnly />
      </div>
    );
  }

  if (selectedRef.kind === 'techCard') {
    const card = techCards.find((item) => item.id === selectedRef.id);
    if (!card) return null;
    const targetName = resolveTargetName(card, objects, systems, equipment);

    if (activeGroupId === 'relations') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Привязка техкарты" description="Техкарта не существует сама по себе. Целью может быть помещение, система или оборудование." />
          <InfoGrid
            items={[
              { label: 'Тип цели', value: targetLabel(card.targetType) },
              { label: 'Объект применения', value: targetName },
              { label: 'Активна', value: card.isActive ? 'Да' : 'Нет' },
            ]}
          />
        </div>
      );
    }

    if (activeGroupId === 'additional') {
      return (
        <div className="parameter-section">
          <SectionTitle title="Операции и ресурсы" description="Планирование работ сюда не входит, здесь только нормативные исходные данные." />
          <TagList title="Операции" tags={card.operations} />
          <TagList title="Персонал" tags={card.personnel} />
          <TagList title="Материалы" tags={card.materials.length > 0 ? card.materials : ['Не заполнено']} />
          <TagList title="СИЗ" tags={card.ppe.length > 0 ? card.ppe : ['Не заполнено']} />
        </div>
      );
    }

    return (
      <div className="parameter-section">
        <SectionTitle title="Основные параметры техкарты" description="Обязательные поля показаны в карточке, расчет объемов не выполняется." />
        <EditableField label="Идентификатор" value={card.id} readOnly />
        <EditableField label="Наименование" value={card.name} onChange={(value) => onUpdateTechCard(card.id, { name: value })} />
        <EditableField label="Тип техкарты" value={card.type} onChange={(value) => onUpdateTechCard(card.id, { type: value })} />
        <EditableField label="Вид работы" value={card.workTypeId} readOnly />
        <EditableField label="Периодичность" value={card.periodicity} onChange={(value) => onUpdateTechCard(card.id, { periodicity: value })} />
        <EditableField
          label="Минимальная продолжительность, чел-ч"
          value={card.minDurationManHours ?? ''}
          type="number"
          empty={card.minDurationManHours === null}
          showEmpty={showEmpty}
          onChange={(value) => onUpdateTechCard(card.id, { minDurationManHours: value === '' ? null : Number(value) })}
        />
      </div>
    );
  }

  const dictionary = dictionaries.find((item) => item.id === selectedRef.id);
  if (!dictionary) return null;
  const parent = dictionaries.find((item) => item.id === dictionary.parentId);
  const children = dictionaries.filter((item) => item.parentId === dictionary.id);

  if (activeGroupId === 'relations') {
    return (
      <div className="parameter-section">
        <SectionTitle title="Связи справочника" description="Справочники отображаются тем же паттерном: дерево слева, карточка справа." />
        <InfoGrid
          items={[
            { label: 'Родитель', value: parent?.title ?? 'Нет' },
            { label: 'Дочерних записей', value: children.length },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="parameter-section">
      <SectionTitle title="Основные параметры справочника" description="Минимальный каркас для единиц измерения, видов работ, дефектов, персонала и материалов." />
      <EditableField label="Идентификатор" value={dictionary.id} readOnly />
      <EditableField label="Наименование" value={dictionary.title} readOnly />
      <EditableField label="Код" value={dictionary.code} readOnly />
      <EditableField label="Описание" value={dictionary.description} readOnly />
    </div>
  );
}

function buildTreeNodes(
  sectionId: NsiSectionId,
  objects: InfrastructureObject[],
  systems: SystemEntity[],
  equipment: EquipmentEntity[],
  techCards: TechCard[],
  dictionaries: DictionaryItem[],
): TreeNode[] {
  if (sectionId === 'objects') {
    return objects.map((object) => {
      const objectType = objectTypes.find((type) => type.id === object.typeId);
      const childCount = objects.filter((item) => item.parentId === object.id).length;
      const linkedSystemCount = systems.filter(
        (system) => system.scopeObjectIds.includes(object.id) || system.linkedRoomIds.includes(object.id),
      ).length;
      const linkedEquipmentCount = equipment.filter((item) => item.placementObjectId === object.id).length;
      const linkedTechCardCount = techCards.filter((item) => item.targetId === object.id).length;
      const summary = `${formatArea(object.area)} · ${childCount} доч. · ${linkedSystemCount} сист. · ${linkedEquipmentCount} обор. · ${linkedTechCardCount} ТК`;

      return {
        id: object.id,
        parentId: object.parentId,
        entityKind: 'object',
        title: object.name,
        subtitle: objectType?.name ?? 'Вид не задан',
        summary,
        warning: object.area === null ? 'нет площади' : object.status === 'retired' ? 'снят с учета' : undefined,
      };
    });
  }

  if (sectionId === 'objectTypes') {
    return objectTypes.map((type) => ({
      id: type.id,
      parentId: type.parentTypeId,
      entityKind: 'objectType',
      title: type.name,
      subtitle: `${type.code} · ${type.shortName}`,
      summary: `${type.allowedChildTypeIds.length} доч. видов · ${type.parameterGroups.length} групп параметров`,
    }));
  }

  if (sectionId === 'techCards') {
    return techCards.map((card) => ({
      id: card.id,
      parentId: null,
      entityKind: 'techCard',
      title: card.name,
      subtitle: `${card.type} · цель: ${targetLabel(card.targetType)}`,
      summary: `${card.periodicity} · ${card.operations.length} опер. · ${card.minDurationManHours ?? '—'} чел-ч`,
      warning: card.operations.length === 0 ? 'нет операций' : undefined,
    }));
  }

  return dictionaries.map((item) => ({
    id: item.id,
    parentId: item.parentId,
    entityKind: 'dictionary',
    title: item.title,
    subtitle: item.code,
    summary: item.description,
  }));
}

function resolveSelectedEntity(
  selectedRef: SelectedRef,
  objects: InfrastructureObject[],
  systems: SystemEntity[],
  equipment: EquipmentEntity[],
  techCards: TechCard[],
  dictionaries: DictionaryItem[],
) {
  if (selectedRef.kind === 'object') {
    const object = objects.find((item) => item.id === selectedRef.id);
    if (!object) return null;
    const objectType = objectTypes.find((type) => type.id === object.typeId);
    return { title: object.name, subtitle: objectType?.name ?? 'Вид не задан' };
  }

  if (selectedRef.kind === 'objectType') {
    const type = objectTypes.find((item) => item.id === selectedRef.id);
    return type ? { title: type.name, subtitle: `${type.code} · ${type.shortName}` } : null;
  }

  if (selectedRef.kind === 'techCard') {
    const card = techCards.find((item) => item.id === selectedRef.id);
    return card ? { title: card.name, subtitle: `${card.type} · ${resolveTargetName(card, objects, systems, equipment)}` } : null;
  }

  const dictionary = dictionaries.find((item) => item.id === selectedRef.id);
  return dictionary ? { title: dictionary.title, subtitle: dictionary.code } : null;
}

function resolveTargetName(
  card: TechCard,
  objects: InfrastructureObject[],
  systems: SystemEntity[],
  equipment: EquipmentEntity[],
) {
  if (card.targetType === 'room') return objects.find((item) => item.id === card.targetId)?.name ?? 'Не найдено';
  if (card.targetType === 'system') return systems.find((item) => item.id === card.targetId)?.name ?? 'Не найдено';
  return equipment.find((item) => item.id === card.targetId)?.name ?? 'Не найдено';
}

function targetLabel(targetType: TechCard['targetType']) {
  const labels: Record<TechCard['targetType'], string> = {
    room: 'помещение',
    system: 'система',
    equipment: 'оборудование',
  };
  return labels[targetType];
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="section-title">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function EditableField({
  label,
  value,
  type = 'text',
  readOnly = false,
  empty = false,
  showEmpty = true,
  onChange,
}: {
  label: string;
  value: string | number;
  type?: 'text' | 'number';
  readOnly?: boolean;
  empty?: boolean;
  showEmpty?: boolean;
  onChange?: (value: string) => void;
}) {
  if (empty && !showEmpty) return null;

  return (
    <label className={empty ? 'field-row empty' : 'field-row'}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={empty ? 'Не заполнено' : undefined}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}

function RelationBlock({
  title,
  description,
  items,
  onToggle,
  singleChoice = false,
}: {
  title: string;
  description: string;
  items: Array<{ id: string; label: string; checked: boolean }>;
  onToggle: (id: string) => void;
  singleChoice?: boolean;
}) {
  const [query, setQuery] = useState('');
  const visibleItems = items.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="relation-block">
      <div className="relation-header">
        <div>
          <b>{title}</b>
          <p>{description}</p>
        </div>
        {!singleChoice ? (
          <span className="counter">{items.filter((item) => item.checked).length} выбрано</span>
        ) : null}
      </div>
      <input className="relation-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по списку" />
      <div className="relation-actions">
        {!singleChoice ? (
          <>
            <button type="button" onClick={() => visibleItems.filter((item) => !item.checked).forEach((item) => onToggle(item.id))}>
              Выбрать все найденные
            </button>
            <button type="button" onClick={() => visibleItems.filter((item) => item.checked).forEach((item) => onToggle(item.id))}>
              Снять все найденные
            </button>
          </>
        ) : null}
      </div>
      <div className="check-list">
        {visibleItems.map((item) => (
          <label key={item.id}>
            <input type="checkbox" checked={item.checked} onChange={() => onToggle(item.id)} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function InfoGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="info-grid">
      {items.map((item) => (
        <div className="info-card" key={item.label}>
          <span>{item.label}</span>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

function TagList({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div className="tag-list">
      <b>{title}</b>
      <div>
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

function KeyValueList({ showEmpty, rows }: { showEmpty: boolean; rows: Array<{ label: string; value: string | number | boolean | null }> }) {
  const visibleRows = showEmpty ? rows : rows.filter((row) => row.value !== null && row.value !== '' && row.value !== 'Не заполнено');

  if (visibleRows.length === 0) return <EmptyState title="Нет заполненных параметров" description="Включите показ пустых полей или заполните параметры." />;

  return (
    <div className="key-value-list">
      {visibleRows.map((row) => (
        <div key={row.label} className={row.value === null || row.value === 'Не заполнено' ? 'key-value-row empty' : 'key-value-row'}>
          <span>{row.label}</span>
          <b>{String(row.value ?? 'Не заполнено')}</b>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export default App;
