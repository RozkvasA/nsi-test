export type NsiSectionId = 'objects' | 'objectTypes' | 'techCards' | 'dictionaries';

export type EntityKind = 'object' | 'objectType' | 'techCard' | 'dictionary';

export type ObjectStatus = 'active' | 'retired';

export type TechCardTargetType = 'room' | 'system' | 'equipment';

export type ParameterGroupId = 'main' | 'relations' | 'additional';

export type TreeActionId = 'add' | 'edit' | 'move' | 'retire' | 'copy';

export type CreateEntityKind = 'rootObject' | 'childObject' | 'room' | 'system' | 'equipment';

export type ParameterDataType = 'string' | 'number' | 'boolean' | 'date' | 'dictionary';

export type ParameterDefaultValue = string | number | boolean | null;

export type RootObjectCreationMode = 'empty' | 'template';

export interface ParameterDefinition {
  id: string;
  name: string;
  code: string;
  dataType: ParameterDataType;
  unit: string;
  required: boolean;
  showInTree: boolean;
  defaultValue: ParameterDefaultValue;
}

export interface ObjectStructureTemplateNode {
  id: string;
  parentNodeId: string | null;
  name: string;
  shortName: string;
  typeId: string;
  quantity: number;
  unit: string;
  parameters: Record<string, ParameterDefaultValue>;
}

export interface ObjectStructureTemplate {
  id: string;
  name: string;
  description: string;
  rootTypeId: string;
  detailLevel: number;
  nodes: ObjectStructureTemplateNode[];
  isDemo: boolean;
}

export interface SelectedRef {
  kind: EntityKind;
  id: string;
}

export interface SelectedEntityView {
  title: string;
  subtitle: string;
}

export interface ParameterGroupView {
  id: ParameterGroupId;
  title: string;
  hint: string;
}

export interface PendingObjectDraft {
  kind: Extract<CreateEntityKind, 'rootObject' | 'childObject' | 'room'>;
  parentObjectId: string | null;
  name: string;
  shortName: string;
  typeId: string;
  area: number | null;
  quantity: number;
  unit: string;
  creationMode: RootObjectCreationMode;
  templateId: string;
  detailLevel: number;
}

export interface RetireImpact {
  targetObjectId: string;
  targetObjectName: string;
  descendantCount: number;
  affectedSystems: number;
  affectedEquipment: number;
  affectedTechCards: number;
  affectedObjectIds: string[];
}

export interface ObjectTypeRetireImpact {
  targetTypeId: string;
  targetTypeName: string;
  childTypeCount: number;
  objectCount: number;
}

export type UiWarning =
  | {
      type: 'moveBlocked';
      title: string;
      message: string;
    }
  | {
      type: 'moveMode';
      title: string;
      message: string;
    }
  | {
      type: 'editHint';
      title: string;
      message: string;
    };

export type DetailsNotice =
  | UiWarning
  | { type: 'retireConfirm'; impact: RetireImpact }
  | { type: 'objectTypeRetireConfirm'; impact: ObjectTypeRetireImpact };

export interface NsiSection {
  id: NsiSectionId;
  title: string;
  description: string;
}

export interface ParameterGroup {
  id: string;
  name: string;
  parameterIds: string[];
}

export interface InfrastructureObject {
  id: string;
  name: string;
  shortName: string;
  typeId: string;
  parentId: string | null;
  area: number | null;
  quantity: number;
  unit: string;
  status: ObjectStatus;
  parameters: Record<string, string | number | boolean | null>;
}

export interface ObjectType {
  id: string;
  name: string;
  code: string;
  shortName: string;
  icon: string;
  parentTypeId: string | null;
  allowedChildTypeIds: string[];
  parameterGroups: ParameterGroup[];
  parameters: ParameterDefinition[];
  canCreateObjects: boolean;
  canEditObjects: boolean;
  canRetireObjects: boolean;
}

export interface SystemEntity {
  id: string;
  name: string;
  typeId: string;
  parentSystemId: string | null;
  scopeType: 'wholeObject' | 'objectNode' | 'singleRoom' | 'multipleRooms';
  scopeObjectIds: string[];
  linkedRoomIds: string[];
  equipmentIds: string[];
  quantity: number;
  unit: string;
  parameters: Record<string, string | number | boolean | null>;
}

export interface EquipmentEntity {
  id: string;
  name: string;
  typeId: string;
  parentEquipmentId: string | null;
  systemId: string;
  placementObjectId: string;
  quantity: number;
  unit: string;
  parameters: Record<string, string | number | boolean | null>;
}

export interface TechCardOperation {
  id: string;
  order: number;
  name: string;
  description: string;
  required: boolean;
  expectedResult: string;
}

export interface TechCardPersonnel {
  id: string;
  positionId: string;
  qualificationId: string;
  gradeId: string;
  count: number;
  minDurationManHours: number | null;
  comment: string;
}

export interface TechCardMaterial {
  id: string;
  materialId: string;
  quantity: number;
  unitId: string;
  required: boolean;
  comment: string;
}

export interface TechCardPpe {
  id: string;
  ppeId: string;
  quantity: number;
  unitId: string;
  required: boolean;
  comment: string;
}

export interface TechCard {
  id: string;
  name: string;
  type: string;
  targetType: TechCardTargetType;
  targetId: string;
  targetObjectTypeId: string;
  workTypeId: string;
  inputDate: string;
  outputDate: string;
  periodicity: string;
  minExecutionInterval: string;
  minDurationManHours: number | null;
  operations: TechCardOperation[];
  personnel: TechCardPersonnel[];
  materials: TechCardMaterial[];
  ppe: TechCardPpe[];
  isActive: boolean;
  isComplex: boolean;
}

export interface DictionaryItem {
  id: string;
  parentId: string | null;
  title: string;
  code: string;
  description: string;
}

export interface TreeNode {
  id: string;
  parentId: string | null;
  entityKind: EntityKind;
  title: string;
  subtitle: string;
  summary: string;
  warning?: string;
}
