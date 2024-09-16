import { SurePlugin } from './sure-plugin';
import {
  AllOfPlugins,
  ExecutableSurePluginConstructor,
  OneOfPlugins,
  SurePluginConstructor,
} from './type';
import { MatchMethodType, allOf, assert, matchPlugins } from './utils';

export interface SureConfig<T> {
  plugins: AllOfPlugins | OneOfPlugins;
  options: T;
}

interface SurePluginData {
  idx: number;
  sp: SurePlugin;
  props: any;
  into: boolean;
}

const enum RunningStatus {
  Noop,
  Matching,
  Executing,
}

export class Sure<T extends { [key: string]: any } = {}> {
  private map = new Map<SurePluginConstructor, SurePluginData>();
  private values: any[];

  private execPlugins: ExecutableSurePluginConstructor[] = [];

  private running = RunningStatus.Noop;
  private nextProps: { [key: string]: any }[][] = [];

  private plugins: AllOfPlugins | OneOfPlugins;

  constructor({ plugins, options }: SureConfig<T>) {
    this.tvsInit(plugins, options, new Set());
    this.plugins = plugins;
    this.values = new Array(this.map.size).fill(undefined);
  }

  destroy() {
    assert(this.running === RunningStatus.Noop);
    this.plugins = allOf([]);
    for (const [, { sp }] of this.map) {
      sp.destroy?.();
    }
    this.map.clear();
  }

  private useValue<P extends SurePlugin>(
    Plugin: SurePluginConstructor<P>
  ): P['match'] extends (...args: any) => infer R ? R : { success: boolean } {
    assert(this.running !== RunningStatus.Noop);
    const { map, values } = this;
    const data = map.get(Plugin);
    assert(data);
    const { idx, sp, props } = data;
    if (!values[idx]) {
      assert(!data.into);
      data.into = true;
      values[idx] = sp.match ? sp.match(props) : matchPlugins(sp, props);
      data.into = false;
    }
    return values[data.idx];
  }

  private usePlugin<P extends SurePlugin>(Plugin: SurePluginConstructor<P>): P;
  private usePlugin(Plugin: SurePluginConstructor) {
    assert(this.running === RunningStatus.Executing);
    const data = this.map.get(Plugin);
    assert(data);
    return data.sp;
  }

  dispatch(...pluginProps: ReturnType<typeof SurePlugin.write>[]) {
    assert(this.running !== RunningStatus.Matching);
    const { nextProps, plugins, map, values, execPlugins } = this;
    nextProps.push(pluginProps);
    if (this.running) {
      return;
    }

    for (let i = 0; i < nextProps.length; i++) {
      const datas: SurePluginData[] = [];
      for (const { Plugin, props } of nextProps[i]) {
        const data = map.get(Plugin);
        assert(data);
        data.props = props;
        datas.push(data);
      }

      this.running = RunningStatus.Matching;
      this.tvsMatch(plugins);
      this.running = RunningStatus.Executing;
      for (const Plugin of execPlugins) {
        this.usePlugin(Plugin).exec();
      }

      execPlugins.length = 0;
      values.fill(undefined);
      for (const data of datas) {
        data.props = undefined;
      }
    }

    nextProps.length = 0;
    this.running = RunningStatus.Noop;
  }

  private tvsInit(
    target: SurePluginConstructor | AllOfPlugins | OneOfPlugins,
    options: T,
    set: Set<SurePluginConstructor>
  ) {
    if (typeof target === 'function') {
      const { map } = this;
      const data = map.get(target);
      if (data) {
        assert(!data.into);
      } else {
        const spd = {
          sp: new target(this, options),
          idx: map.size,
          props: undefined,
          into: true,
        };
        map.set(target, spd);
        for (const Plugin of spd.sp.deps) {
          this.tvsInit(Plugin, options, set);
        }
        spd.into = false;
      }
      return;
    }
    if (target.type === MatchMethodType.OneOf) {
      for (const Plugin of target.mustMatch) {
        this.tvsInit(Plugin, options, set);
      }
    }
    for (const item of target.Plugins) {
      if (typeof item === 'function') {
        assert(!set.has(item));
        set.add(item);
      }
      this.tvsInit(item, options, set);
    }
  }

  private tvsMatch(target: AllOfPlugins | OneOfPlugins) {
    const { execPlugins } = this;
    if (target.type === MatchMethodType.AllOf) {
      let success = false;
      for (const item of target.Plugins) {
        if (typeof item === 'function') {
          if (this.useValue(item).success) {
            execPlugins.push(item);
            success = true;
          }
        } else {
          if (this.tvsMatch(item)) {
            success = true;
          }
        }
      }
      return success;
    }

    for (const Plugin of target.mustMatch) {
      if (!this.useValue(Plugin).success) {
        return false;
      }
    }
    for (const item of target.Plugins) {
      if (typeof item === 'function') {
        if (this.useValue(item).success) {
          execPlugins.push(item);
          return true;
        }
      } else {
        if (this.tvsMatch(item)) {
          return true;
        }
      }
    }
    return false;
  }
}
