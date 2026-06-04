export interface ProfilePageAction {
  label: string;
  ariaLabel: string;
}

export function profilePageAction(profileName: string): ProfilePageAction {
  return {
    label: 'View page',
    ariaLabel: `View ${profileName} page`,
  };
}
