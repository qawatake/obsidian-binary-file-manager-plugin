import { App, Plugin } from 'obsidian';

export class UncoveredApp extends App {
	plugins: { plugins: PluginMap };
}

interface PluginMap {
	[K: string]: Plugin;
}
