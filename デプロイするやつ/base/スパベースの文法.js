// Supabase 初期化（FROM句に対応）
const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');


/*
1. SELECT文の基本形（JOIN句を含む）
SQL:
  SELECT COLUMN1, RELATION_TABLE.COLUMN2
  FROM TABLE_NAME
  JOIN RELATION_TABLE ON TABLE_NAME.foreign_key = RELATION_TABLE.primary_key
  WHERE WHERE_COLUMN = 'WHERE_VALUE'
  ORDER BY ORDER_COLUMN ASC
  LIMIT LIMIT_VALUE OFFSET OFFSET_VALUE;
*/
const { data: selectData, error: selectError } = await supabase
  .from('TABLE_NAME')                       // FROM TABLE_NAME
  .select('COLUMN1, RELATION_TABLE(COLUMN2)') // JOIN RELATION_TABLE ON ... の部分をSupabase流に表現
  .eq('WHERE_COLUMN', 'WHERE_VALUE')       // WHERE WHERE_COLUMN = 'WHERE_VALUE'
  .order('ORDER_COLUMN', { ascending: true })  // ORDER BY ORDER_COLUMN ASC
  .range(OFFSET_START, OFFSET_END);         // LIMIT/OFFSET → range(開始位置, 終了位置)



/*
2. INSERT文
SQL:
  INSERT INTO TABLE_NAME (COLUMN1, COLUMN2)
  VALUES ('VALUE1', 'VALUE2'), (...);
*/
const { data: insertData, error: insertError } = await supabase
  .from('TABLE_NAME')                  // INTO TABLE_NAME
  .insert([
    { COLUMN1: 'VALUE1', COLUMN2: 'VALUE2' },  // VALUES (...)
  ]);


/*
3. UPDATE文
SQL:
  UPDATE TABLE_NAME
  SET COLUMN_TO_UPDATE = 'NEW_VALUE'
  WHERE WHERE_COLUMN = 'WHERE_VALUE';
*/
const { data: updateData, error: updateError } = await supabase
  .from('TABLE_NAME')                  // UPDATE TABLE_NAME
  .update({ COLUMN_TO_UPDATE: 'NEW_VALUE' })  // SET COLUMN_TO_UPDATE = 'NEW_VALUE'
  .eq('WHERE_COLUMN', 'WHERE_VALUE');           // WHERE WHERE_COLUMN = 'WHERE_VALUE'


/*
4. DELETE文
SQL:
  DELETE FROM TABLE_NAME
  WHERE WHERE_COLUMN = 'WHERE_VALUE';
*/
const { data: deleteData, error: deleteError } = await supabase
  .from('TABLE_NAME')                  // DELETE FROM TABLE_NAME
  .delete()                           // DELETE
  .eq('WHERE_COLUMN', 'WHERE_VALUE');           // WHERE WHERE_COLUMN = 'WHERE_VALUE'


/*
5. COUNT文（件数取得）
SQL:
  SELECT COUNT(*) FROM TABLE_NAME WHERE WHERE_COLUMN = 'WHERE_VALUE';
*/
const { count, error: countError } = await supabase
  .from('TABLE_NAME')                  // FROM TABLE_NAME
  .select('*', { count: 'exact', head: true })  // SELECT COUNT(*)
  .eq('WHERE_COLUMN', 'WHERE_VALUE');             // WHERE WHERE_COLUMN = 'WHERE_VALUE'


/*
6. RPC（Postgres関数呼び出し）
SQL:
  SELECT * FROM FUNCTION_NAME('PARAM1_VALUE');
*/
const { data: rpcData, error: rpcError } = await supabase.rpc(
  'FUNCTION_NAME',                     // FUNCTION_NAME
  { PARAM1: 'PARAM1_VALUE' }           // パラメータ
);


/*
7. ファイルアップロード
SQL: （SQLではなくストレージ操作）
*/
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('BUCKET_NAME')                  // バケット名（ファイル置き場）
  .upload('PATH/TO/FILE.EXT', FILE_OBJECT);  // ファイルアップロード（パスとファイル）


/*
8. ファイルダウンロード
SQL: （SQLではなくストレージ操作）
*/
const { data: downloadData, error: downloadError } = await supabase.storage
  .from('BUCKET_NAME')                  // バケット名
  .download('PATH/TO/FILE.EXT');        // ファイルダウンロード（パス）


/*
9. 認証サインアップ
SQL: （SQLではなく認証API）
*/
const { user, session, error: signUpError } = await supabase.auth.signUp({
  email: 'EMAIL',                      // ユーザメール
  password: 'PASSWORD',                // パスワード
});


/*
10. 認証サインイン
SQL: （SQLではなく認証API）
*/
const { user, session, error: signInError } = await supabase.auth.signInWithPassword({
  email: 'EMAIL',                      // ユーザメール
  password: 'PASSWORD',                // パスワード
});


/*
11. 認証サインアウト
SQL: （SQLではなく認証API）
*/
await supabase.auth.signOut();        // サインアウト処理
