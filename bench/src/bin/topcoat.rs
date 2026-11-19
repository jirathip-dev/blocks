use std::sync::{LazyLock, Mutex};

use blocks_bench::{Rows, Update, lock};
use topcoat::{
    Result,
    asset::{AssetBundle, RouterBuilderAssetExt, asset},
    context::Cx,
    router::{Router, page},
    runtime::{Event, RouterBuilderRuntimeExt, Signal, procedure, shard, signal},
    view::{View, view},
};

static ROWS: LazyLock<Mutex<Rows>> = LazyLock::new(Mutex::default);

#[page("/")]
async fn home(cx: &Cx) -> Result<impl View> {
    *lock(&ROWS) = Rows::default();
    let revision = signal(cx, || 0u32);
    Ok(view! {
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <link rel="stylesheet" href=(asset!("../../../web/dist/blocks.css"))>
                topcoat::runtime::script()
            </head>
            <body>
                <button id="u1" @click=$(async |_e: Event| { bump(1).await; revision.increment(); })>"one"</button>
                <button id="u2" @click=$(async |_e: Event| { bump(2).await; revision.increment(); })>"insert"</button>
                <button id="u3" @click=$(async |_e: Event| { bump(3).await; revision.increment(); })>"twenty"</button>
                <div class="scr">
                    <p class="tabh"><span class="tw b-screen__title">"rows"</span></p>
                    list(revision: revision)
                </div>
            </body>
        </html>
    })
}

#[shard]
async fn list(revision: Signal<u32>) -> Result<impl View> {
    let _ = revision.get();
    let all = lock(&ROWS).rows.clone();
    Ok(view! {
        for r in all {
                <div class="row" id=(r.id.clone()) data-id=(r.id)>
                    <span class="rm">
                        <span class="rt b-row__title">(r.title)</span>
                        <span class="rs b-row__subtitle">(r.subtitle)</span>
                    </span>
                    <span class="rv b-row__value">(r.value)</span>
                </div>
        }
    })
}

#[procedure]
async fn bump(kind: usize) -> Result<()> {
    if let Some(u) = Update::named(&kind.to_string()) {
        lock(&ROWS).apply(u);
    }
    Ok(())
}

fn router() -> std::io::Result<Router> {
    let assets = AssetBundle::load().map_err(std::io::Error::other)?;
    Ok(Router::builder()
        .page(home)
        .route(list)
        .route(bump)
        .assets(assets)
        .runtime()
        .build())
}

#[tokio::main]
async fn main() -> std::io::Result<()> {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
    println!("http://{}", listener.local_addr()?);
    topcoat::serve(listener, router()?).await
}
