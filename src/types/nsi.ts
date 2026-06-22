export type NsiSectionId = 'objects' | 'objectTypes' | 'techCards' | 'dictionaries';

export type EntityKind = 'object' | 'objectType' | 'techCard' | 'dictionary';

export type ObjectStatus = 'active' | 'retired';

export type TechCardTargetType = 'room' | 'system' | 'equipment';

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

export interface TechCard {
  id: string;
  name: string;
  type: string;
  targetType: TechCardTargetType;
  targetId: string;
  workTypeId: string;
  periodicity: string;
  minDurationManHours: number | null;
  operations: string[];
  personnel: string[];
  materials: string[];
  ppe: string[];
  isActive: boolean;
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
