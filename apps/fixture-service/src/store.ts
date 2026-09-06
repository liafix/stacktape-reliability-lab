import type {
  CreateFixtureItemInput,
  FixtureItem
} from './types.ts';

const INITIAL_ITEMS: readonly FixtureItem[] = [
  {
    id: 'item-1',
    name: 'Synthetic Alpha',
    description: 'Candidate-owned deterministic fixture data.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'item-2',
    name: 'Synthetic Beta',
    description: 'No customer or production data is used.',
    createdAt: '2026-01-02T00:00:00.000Z'
  }
];

export interface FixtureStore {
  list(): readonly FixtureItem[];
  get(id: string): FixtureItem | undefined;
  create(input: CreateFixtureItemInput): FixtureItem;
}

export function createFixtureStore(): FixtureStore {
  const items = new Map(INITIAL_ITEMS.map((item) => [item.id, item]));
  let nextId = INITIAL_ITEMS.length + 1;

  return {
    list() {
      return [...items.values()];
    },
    get(id) {
      return items.get(id);
    },
    create(input) {
      const item: FixtureItem = {
        id: `item-${nextId}`,
        name: input.name,
        description: input.description,
        createdAt: new Date().toISOString()
      };
      nextId += 1;
      items.set(item.id, item);
      return item;
    }
  };
}
