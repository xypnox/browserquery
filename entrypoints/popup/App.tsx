import { createSignal } from 'solid-js';
import { ResponseType } from '@/src/types';
import './App.css';
import { Tabs } from 'wxt/browser';
import { sendMessage } from './messaging';

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

function App() {
  // const [tabsData, setTabsData] = createSignal<Tabs.Tab[]>([]);
  const [tabsData, { refetch }] = createResource(async () => tabsDataFecther())

  const [filter, setFilter] = createSignal<string>('');

  const filtered = () => {
    if (!filter() || filter() === '') return tabsData();
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
          <h1 class="title">Tabs</h1>
          <button onClick={refetch}>Refresh</button>
        </header>
        <div class="actionrow">
          <input type="text" placeholder="Search" onInput={(e) => setFilter(e.currentTarget.value)} />
          <Show when={filter()}>
            <button onClick={() => setFilter('')}>Clear</button>
            <button onClick={closeFiltered}>Close All filtrered </button>
          </Show>
        </div>
        <For each={filtered()}>
          {(tab) => (
            <div class="tabrow">
              <div class="tabdetails">
                <Show when={tab.favIconUrl}>
                  <img src={tab.favIconUrl} alt="favicon" class="favicon" />
                </Show>
                <Show when={!tab.favIconUrl}>
                  <div class="favicon">O</div>
                </Show>
                <p>{tab.title}</p>
              </div>
              <button onClick={() => sendMessage({ type: 'closeTabs', data: [tab.id] }).finally(refetch)}>X</button>
            </div>
          )}
        </For>
      </div>
    </>
  );
}

export default App;
