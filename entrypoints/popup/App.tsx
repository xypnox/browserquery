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

const groupByTypeArray = ['domain', 'window', 'active', 'time', 'audio', 'article', 'pinned', 'duplicate'] as const;
type GroupByType = typeof groupByTypeArray[number];

interface GroupByData {
  type: GroupByType;
  groupKey: (tab: Tabs.Tab) => string;
  groupFilter?: (key: string, tabs: Tabs.Tab[]) => boolean;
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
  {
    type: 'duplicate',
    groupKey: (tab: Tabs.Tab) => tab.url ?? 'No URL',
    // Which groups to filter out
    groupFilter: (_key: string, tabs: Tabs.Tab[]) => tabs.length > 1
  }
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

const GroupedTabs = (props: { grouped: [string, Tabs.Tab[]][], refetch: () => void, showClose?: boolean }) => {
  const [expanded, setExpanded] = createSignal<Record<string, boolean>>(props.grouped.reduce((acc, [key]) => {
    acc[key] = false;
    return acc;
  }, {} as Record<string, boolean>))

  const toggleExpanded = (key: string) => {
    const expandedValue = { ...expanded() };
    expandedValue[key] = !expandedValue[key];
    setExpanded((exp) => ({ ...exp, [key]: !exp[key] }));
  }

  // console.log('Expanded:', expanded());

  return <For each={props.grouped.sort(([_keyA, tabsA], [_keyB, tabsB]) => tabsB.length - tabsA.length)}>
    {([key, tabs]) => (
      <div class="group">
        <div class="row">
          <div>{tabs.length}</div>
          <h2>{key}</h2>
          <button onClick={() => toggleExpanded(key)}>{expanded()[key] ? 'Collapse' : 'Expand'}</button>
          <Show when={props.showClose}>
            <button onClick={() => sendMessage({ type: 'closeTabs', data: tabs.map((tab) => tab.id) }).finally(props.refetch)}>x*</button>
            <button onClick={() => sendMessage({ type: 'closeTabs', data: tabs.map((tab) => tab.id).slice(1) }).finally(props.refetch)}>x-1</button>
          </Show>
        </div>
        <Show when={expanded()[key]}>
          <For each={tabs}>
            {(tab) => (
              <TabRow tab={tab} refetch={props.refetch} />
            )}
          </For>
        </Show>
      </div>
    )}
  </For>
}

function App() {
  // const [tabsData, setTabsData] = createSignal<Tabs.Tab[]>([]);
  const [tabsData, { refetch }] = createResource(async () => tabsDataFecther())

  const [filter, setFilter] = createSignal<string>('');

  const [groupByIndex, setGroupByIndex] = createSignal<GroupByType | undefined>(undefined);

  const groupedTabs = () => {

    const groupByData = groupBy.find((group) => group.type === groupByIndex());
    if (!groupByData) return [];
    const gtabs = groupby(filtered(), groupByData.groupKey);
    const filteredgTabs = groupByData.groupFilter ? Object.entries(gtabs).filter(([key, tabs]) => groupByData.groupFilter!(key, tabs)) : Object.entries(gtabs)
    return filteredgTabs
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  }

  const filtered = () => {
    if (!filter() || filter() === '') return tabsData() ?? [];
    if (!tabsData()) return [];
    return tabsData()!.filter((tab) =>
      tab.title?.toLowerCase().includes(filter().toLowerCase())
      || tab.url?.toLowerCase().includes(filter().toLowerCase())
    );
  }

  const closeFiltered = () => {
    const filteredTabs = filtered();
    if (!filteredTabs || filteredTabs.length === 0) return;
    sendMessage({ type: 'closeTabs', data: filtered()!.map((tab) => tab.id) }).finally(refetch);
  }

  return (
    <>
      <div class="flow popup">
        <header>
          <div>{tabsData()?.length} Tabs</div>
          <h1 class="title">Historia</h1>
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
            <GroupedTabs grouped={groupedTabs()} refetch={refetch} showClose={groupByIndex() === 'duplicate'} />
          </Show>
        </div>
      </div>
    </>
  );
}

export default App;
