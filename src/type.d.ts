import { Sure } from './sure';
import { SurePlugin } from './sure-plugin';
import { MatchMethodType } from './utils';

export type ExecutableSurePlugin = SurePlugin & {
  exec: NonNullable<SurePlugin['exec']>;
};

export type SurePluginConstructor<T extends SurePlugin = SurePlugin> = new (
  sure: Sure,
  options: any
) => T;

export type ExecutableSurePluginConstructor<
  T extends ExecutableSurePlugin = ExecutableSurePlugin
> = new (sure: Sure, options: any) => T;

export interface AllOfPlugins {
  type: MatchMethodType.AllOf;
  Plugins: (ExecutableSurePluginConstructor | AllOfPlugins | OneOfPlugins)[];
}

export interface OneOfPlugins {
  type: MatchMethodType.OneOf;
  mustMatch: SurePluginConstructor[];
  Plugins: (ExecutableSurePluginConstructor | AllOfPlugins | OneOfPlugins)[];
}
