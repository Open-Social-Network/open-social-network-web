export interface ProfilePageAction {
  title: string;
  ariaLabel: string;
}

export function profilePageAction(profileName: string): ProfilePageAction {
  return {
    title: 'View page',
    ariaLabel: `View ${profileName} page`,
  };
}
