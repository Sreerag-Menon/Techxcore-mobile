/** Dynamic menu types from get_member_menu */

export interface MenuItem {
  menu_id: number;
  screen_id?: number;
  menu_name: string;
  route: string;
  logo?: string;
  parent_id?: number;
  has_children?: boolean | number;
  permissions?: string;
  non_link?: boolean | number;
  home?: boolean | number;
  hidden?: boolean | number;
}

export interface MenuState {
  items: MenuItem[];
  isLoading: boolean;
  error: string | null;
}

export type MobileRouteTarget =
  | { type: 'route'; path: string }
  | { type: 'tab'; path: string }
  | { type: 'hub'; path: string; children: MenuItem[] }
  | { type: 'coming_soon'; title: string };
