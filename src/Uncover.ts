import { App, type Plugin } from 'obsidian';

export class UncoveredApp extends App {
	declare plugins: { plugins: PluginMap };
}

interface PluginMap {
	[K: string]: Plugin;
}
