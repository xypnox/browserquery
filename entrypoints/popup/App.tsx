import { createSignal } from 'solid-js';
import { ResponseType } from '@/src/types';
import './App.css';
import { Tabs } from 'wxt/browser';
import { sendMessage } from './messaging';
import groupby from 'lodash.groupby';

const tabsDataFecther = async () => {
  try {
    const dataDirect: ResponseType<Tabs.Tab[]> = await sendMessage({ type: 'getTabs' });
    // console.log('Data direct:', dataDirect);
    return dataDirect.data;
  } catch (e) {
    // console.error('Error getting tabs data:', e);
    return [];
  }
}

const groupByTypeArray = ['domain', 'window', 'active', 'time', 'audio', 'article', 'pinned'] as const;
type GroupByType = typeof groupByTypeArray[number];

interface GroupByData {
  type: GroupByType;
  groupKey: (tab: Tabs.Tab) => string;
}

const groupBy: GroupByData[] = [
  {
    type: 'domain',
    groupKey: (tab: Tabs.Tab) => {
      if (!tab.url) return 'No URL';
      const url = new URL(tab.url);
      return url.hostname;
    }
  },
  {
    type: 'window',
    groupKey: (tab: Tabs.Tab) => {
      return tab.windowId?.toString() ?? 'No Window';
    }
  },
  {
    type: 'article',
    groupKey: (tab: Tabs.Tab) => {
      return tab.isArticle ? 'Article' : 'Not Article';
    }
  },
  {
    type: 'pinned',
    groupKey: (tab: Tabs.Tab) => {
      return tab.pinned ? 'Pinned' : 'Unpinned';
    }
  },
  {
    type: 'active',
    groupKey: (tab: Tabs.Tab) => {
      return tab.active ? 'Active' : 'Inactive';
    }
  },
  {
    type: 'time',
    groupKey: (tab: Tabs.Tab) => {
      const date = new Date(tab.lastAccessed!);
      return `${date.getMonth()}-${date.getFullYear()}`;
    }
  },
  {
    type: 'audio',
    groupKey: (tab: Tabs.Tab) => {
      const isMuted = tab.mutedInfo?.muted;
      if (isMuted) return 'Muted';
      const isAudible = tab.audible;
      if (isAudible) return 'Audible';
      return 'Silent';
    }
  },
]

const TabRow = (props: { tab: Tabs.Tab, refetch: () => void }) => (
  <div class="tabrow">
    <div class="tabdetails">
      <div>
        {props.tab.windowId}
      </div>
      <Show when={props.tab.favIconUrl}>
        <img src={props.tab.favIconUrl} alt="favicon" class="favicon" />
      </Show>
      <Show when={!props.tab.favIconUrl}>
        <div class="favicon">O</div>
      </Show>
      <p>{props.tab.title}</p>
    </div>
    <button onClick={() => sendMessage({ type: 'closeTabs', data: [props.tab.id] }).finally(props.refetch)}>X</button>
  </div>)

function App() {
  // const [tabsData, setTabsData] = createSignal<Tabs.Tab[]>([]);
  const [tabsData, { refetch }] = createResource(async () => tabsDataFecther())

  const [filter, setFilter] = createSignal<string>('');

  const [groupByIndex, setGroupByIndex] = createSignal<GroupByType | undefined>(undefined);

  const groupedTabs = (tabs: Tabs.Tab[]) => {
    const groupByData = groupBy.find((group) => group.type === groupByIndex());
    if (!groupByData) return {} as Record<string, Tabs.Tab[]>;
    return groupby(tabs, groupByData.groupKey);
  }

  const filtered = () => {
    if (!filter() || filter() === '') return tabsData() ?? [];
    if (!tabsData()) return [];
    return tabsData()!.filter((tab) =>
      tab.title?.toLowerCase().includes(filter().toLowerCase())
      || tab.url?.toLowerCase().includes(filter().toLowerCase())
    );
  }

  const grouped = () => Object.entries(groupedTabs(filtered())).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  const closeFiltered = () => {
    const filteredTabs = filtered();
    if (!filteredTabs || filteredTabs.length === 0) return;
    sendMessage({ type: 'closeTabs', data: filtered()!.map((tab) => tab.id) }).finally(refetch);
  }

  return (
    <>
      <div class="flow popup">
        <header>
          <h1 class="title">Tabs</h1>
          <button onClick={refetch}>Refresh</button>
        </header>
        <div class="actionrow">
          <input type="text" placeholder="Search" onInput={(e) => setFilter(e.currentTarget.value)} />

          <select onChange={(e) => {
            if (e.currentTarget.value === '') return setGroupByIndex(undefined);

            if (!groupBy.find((group) => group.type === e.currentTarget.value as GroupByType)) return;
            setGroupByIndex(e.currentTarget.value as GroupByType)
          }}>
            <option value="">None</option>
            <For each={groupBy}>
              {(group) => (
                <option value={group.type}>{group.type}</option>
              )}
            </For>
          </select>
          <Show when={filter()}>
            <button onClick={() => setFilter('')}>Clear</button>
            <button onClick={closeFiltered}>Close All filtrered </button>
          </Show>
        </div>
        <div>
          <Show when={!groupByIndex()}>
            <For each={filtered()}>
              {(tab) => (<TabRow tab={tab} refetch={refetch} />)}
            </For>
          </Show>
          <Show when={groupByIndex()}>
            <For each={grouped()}>
              {([key, tabs]) => (
                <div class="group">
                  <h2>{key}</h2>
                  <For each={tabs}>
                    {(tab) => (
                      <TabRow tab={tab} refetch={refetch} />
                    )}
                  </For>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>
    </>
  );
}

export default App;
