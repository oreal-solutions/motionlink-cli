import git from 'simple-git';

export default class GitService {
  /**
   * Returns the git remote url for the given folder.
   *
   * Yields empty string if non exists.
   */
  public async findGitRemoteUrl(path: string): Promise<string> {
    const res = await git({
      baseDir: path,
    }).getConfig('remote.origin.url');

    return res.value ?? '';
  }

  private static _instance: GitService;
  public static get instance(): GitService {
    return this._instance ?? (this._instance = new GitService());
  }

  public static setMockedInstance(instance: GitService) {
    this._instance = instance;
  }
}
