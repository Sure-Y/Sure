import { Sure } from './sure';
import { SurePluginConstructor } from './type';

export abstract class SurePlugin<T extends { [key: string]: any } = {}> {
  static write<K extends SurePlugin>(
    this: SurePluginConstructor<K>,
    props: K extends SurePlugin<infer R> ? R : never
  ) {
    return { Plugin: this, props };
  }
  useValue<P extends SurePlugin>(Plugin: SurePluginConstructor<P>) {
    const s = this.sure as unknown as { useValue: Sure['useValue'] };
    return s.useValue(Plugin);
  }
  usePlugin<P extends SurePlugin>(Plugin: SurePluginConstructor<P>): P {
    const s = this.sure as unknown as { usePlugin: Sure['usePlugin'] };
    return s.usePlugin(Plugin);
  }

  match?(props: T | undefined): any;
  exec?(): void;

  deps: SurePluginConstructor[] = [];
  constructor(public sure: Sure) {}
  destroy?(): void;
}
