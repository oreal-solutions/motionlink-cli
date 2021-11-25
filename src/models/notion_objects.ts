// All the types in this file were copied from:
// https://github.com/makenotion/notion-sdk-js/blob/main/src/api-endpoints.ts

export type IdRequest = string | string;
export type TextRequest = string;

// See: https://developers.notion.com/reference/rich-text#text-objects
export type TextObject = {
  type: 'text';
  text: {
    content: string;
    link: {
      url: TextRequest;
    } | null;
  };
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color:
      | 'default'
      | 'gray'
      | 'brown'
      | 'orange'
      | 'yellow'
      | 'green'
      | 'blue'
      | 'purple'
      | 'pink'
      | 'red'
      | 'gray_background'
      | 'brown_background'
      | 'orange_background'
      | 'yellow_background'
      | 'green_background'
      | 'blue_background'
      | 'purple_background'
      | 'pink_background'
      | 'red_background';
  };
  plain_text: string;
  href: string | null;
};

// See: https://developers.notion.com/reference/rich-text#mention-objects
export type MentionObject = {
  type: 'mention';
  mention: UserObject | DateObject | PageMentionObject | DatabaseMentionObject;
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color:
      | 'default'
      | 'gray'
      | 'brown'
      | 'orange'
      | 'yellow'
      | 'green'
      | 'blue'
      | 'purple'
      | 'pink'
      | 'red'
      | 'gray_background'
      | 'brown_background'
      | 'orange_background'
      | 'yellow_background'
      | 'green_background'
      | 'blue_background'
      | 'purple_background'
      | 'pink_background'
      | 'red_background';
  };
  plain_text: string;
  href: string | null;
};

export type UserObject = {
  type: 'user';
  user:
    | {
        id: IdRequest;
        object: 'user';
      }
    | {
        type: 'person';
        person: {
          email: string;
        };
        name: string | null;
        avatar_url: string | null;
        id: IdRequest;
        object: 'user';
      }
    | {
        type: 'bot';
        bot:
          | Record<string, never>
          | {
              owner:
                | {
                    type: 'user';
                    user:
                      | {
                          type: 'person';
                          person: {
                            email: string;
                          };
                          name: string | null;
                          avatar_url: string | null;
                          id: IdRequest;
                          object: 'user';
                        }
                      | {
                          id: IdRequest;
                          object: 'user';
                        };
                  }
                | {
                    type: 'workspace';
                    workspace: true;
                  };
            };
        name: string | null;
        avatar_url: string | null;
        id: IdRequest;
        object: 'user';
      };
};

export type DateObject = {
  type: 'date';
  date: {
    start: string;
    end: string | null;
  };
};

export type PageMentionObject = {
  type: 'page';
  page: {
    id: IdRequest;
  };
};

export type DatabaseMentionObject = {
  type: 'database';
  database: {
    id: IdRequest;
  };
};

// See: https://developers.notion.com/reference/rich-text#equation-objects
export type EquationObject = {
  type: 'equation';
  equation: {
    expression: TextRequest;
  };
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color:
      | 'default'
      | 'gray'
      | 'brown'
      | 'orange'
      | 'yellow'
      | 'green'
      | 'blue'
      | 'purple'
      | 'pink'
      | 'red'
      | 'gray_background'
      | 'brown_background'
      | 'orange_background'
      | 'yellow_background'
      | 'green_background'
      | 'blue_background'
      | 'purple_background'
      | 'pink_background'
      | 'red_background';
  };
  plain_text: string;
  href: string | null;
};

export type FileObject =
  | {
      type: 'external';
      external: {
        url: string;
      };
      caption: Array<TextObject | MentionObject | EquationObject>;
    }
  | {
      type: 'file';
      file: {
        url: string;
        expiry_time: string;
      };
      caption: Array<TextObject | MentionObject | EquationObject>;
    };
