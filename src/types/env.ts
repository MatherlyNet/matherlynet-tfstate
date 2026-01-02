import type { DurableLock } from "../durableLock";

export interface Env {
	USERNAME: string;
	PASSWORD: string;
	TFSTATE_BUCKET: R2Bucket;
	TFSTATE_LOCK: DurableObjectNamespace<DurableLock>;
}
