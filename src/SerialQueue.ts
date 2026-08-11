export class SerialQueue {
	private tail: Promise<void> = Promise.resolve();

	enqueue(task: () => Promise<void>): Promise<void> {
		const next = this.tail.then(task, task);
		this.tail = next.catch(() => undefined);
		return next;
	}
}
