Template, GameSession, CreateSessionの再設計

現在Templateが以下のフィールドを持っている。
- Roles
- Channels

GameSessionもTemplateという雛形から作られるため、それらの実体を持っている。
また、CreateSessionでは、SessionName=CategoryNameとして、GameSessionはCategoryIDを持つようになっている。

これらを以下のように変えるべきだと考える。

- Role, Category, Channelは、それぞれNodeのアクションによって作成・変更・削除される
- GameSessionは、Role, Category, Channelの状態を管理する
  - 例えば
    - Channelの権限は、GameSession内に存在するRoleに対してのみ操作できる
    - Channelは、GameSession内に存在するCategory以下でのみ操作できる

これは以下のような理由によるもの。

- CreateSession時に行う処理をすべてノードアクションとして定義できる
- Discordのエンティティ作成などはCreateSession時以外でも行えるようにしたい
- カテゴリ名を管理上のGameSession名と分けたい
- アクションによって追加・削除されるRoles, ChannelsをTemplateとして管理するべきでない
