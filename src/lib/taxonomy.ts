
// Taxonomia centralizada para manter consistência entre tags, eventos e relatórios

// Tipos de tags permitidos no banco
export type TagType = 'page-view' | 'pin' | 'click-button';

// Tipos de eventos canônicos (normalizados)
export type EventType = 'page_view' | 'pin_click' | 'click';

// Mapeamento de tag type para event type
export const TAG_TO_EVENT_TYPE: Record<TagType, EventType> = {
  'page-view': 'page_view',
  'pin': 'pin_click',
  'click-button': 'click'
};

// Mapeamento de event type para tag type
export const EVENT_TO_TAG_TYPE: Record<EventType, TagType> = {
  'page_view': 'page-view',
  'pin_click': 'pin',
  'click': 'click-button'
};

// Labels para exibição nas interfaces (português)
export const TAG_LABELS: Record<TagType, string> = {
  'page-view': 'Ad View',
  'pin': 'Como Chegar',
  'click-button': 'Click CTA'
};

export const EVENT_LABELS: Record<EventType, string> = {
  'page_view': 'Ad View',
  'pin_click': 'Como Chegar',
  'click': 'Click CTA'
};

// Labels para métricas nos relatórios
export const METRIC_LABELS = {
  page_views: 'Page Views',
  cta_clicks: 'Click Buttons',
  pin_clicks: 'Map Pins',
  total_clicks: 'Total Clicks',
  ctr: 'CTR (%)'
} as const;

// Função utilitária para normalizar event_type baseado no tag_type
export const normalizeEventType = (tagType: TagType, providedEventType?: string): EventType => {
  // Sempre usa o mapeamento canônico baseado no tag type
  return TAG_TO_EVENT_TYPE[tagType];
};

// Função para obter label do evento baseado no tipo
export const getEventLabel = (eventType: EventType): string => {
  return EVENT_LABELS[eventType];
};

// Função para obter label da tag baseado no tipo
export const getTagLabel = (tagType: TagType): string => {
  return TAG_LABELS[tagType];
};

// Função para classificar evento baseado no tag type (para compatibilidade com dados antigos)
export const classifyEventByTagType = (event: any, tagType: TagType): EventType => {
  // Com o trigger no banco, todos os eventos novos já vêm normalizados
  // Mas mantemos essa função para robustez
  if (event.event_type && Object.values(TAG_TO_EVENT_TYPE).includes(event.event_type)) {
    return event.event_type as EventType;
  }
  
  // Fallback: usa o tag type para determinar o event type correto
  return TAG_TO_EVENT_TYPE[tagType];
};
