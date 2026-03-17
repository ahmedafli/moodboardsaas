"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

interface Product {
    productName: string;
    imageUrl: string;
    codeItem: string;
    price: string;
}

export default function Home() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url.trim() }),
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const data = await response.json();
            console.log("Webhook response:", data);
            const items: Product[] = Array.isArray(data) ? data : [data];
            setProducts(items);
        } catch (err) {
            console.error("Webhook error:", err);
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex-1 overflow-y-auto no-scrollbar p-2 flex flex-col gap-12">
            <section className="max-w-3xl mx-auto w-full mt-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 glass-bg rounded-3xl mb-8 shadow-inner">
                    <Icon icon="lucide:cloud-download" className="text-4xl text-[#f59e0b]" />
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
                    Collect Data <span className="text-[#f59e0b]">Smartly</span>
                </h1>
                
                <p className="text-slate-500 text-lg mb-10 max-w-xl mx-auto">
                    Paste any product or furniture URL to automatically extract high-fidelity assets for your moodboard builder.
                </p>
                
                <div className="relative group max-w-2xl mx-auto">
                    <div className="absolute inset-0 bg-orange-500/5 blur-3xl group-focus-within:bg-orange-500/10 transition-colors"></div>
                    <form onSubmit={handleSubmit} className="relative flex items-center p-2 glass-bg rounded-[2rem] shadow-2xl focus-within:border-[#f59e0b] transition-all border border-transparent">
                        <div className="pl-6 text-slate-400 flex items-center">
                            <Icon icon="lucide:link-2" className="text-2xl" />
                        </div>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={loading}
                            placeholder="paste product url"
                            className="flex-1 bg-transparent border-none outline-none px-6 py-5 text-lg placeholder:text-slate-300 text-slate-900 font-medium disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            id="btn-collect-product"
                            disabled={loading || !url.trim()}
                            className="px-10 py-5 bg-slate-900 hover:bg-black text-white font-bold rounded-[1.5rem] shadow-xl transition-all active:scale-95 flex items-center gap-2 group/btn cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Icon icon="lucide:loader-2" className="animate-spin text-lg" />
                                    <span>Collecting</span>
                                </>
                            ) : (
                                <>
                                    <span>Collect</span>
                                    <Icon icon="lucide:arrow-right" className="group-hover/btn:translate-x-1 transition-transform text-lg" />
                                </>
                            )}
                        </button>
                    </form>
                    {error && (
                        <p className="absolute -bottom-8 left-0 right-0 text-sm text-red-500 text-center font-medium">{error}</p>
                    )}
                </div>
            </section>

            {products.length > 0 && (
                <section className="max-w-7xl mx-auto w-full pb-20">
                    <div className="flex items-center justify-between mb-8 px-4">
                        <h2 className="text-xl font-bold text-slate-900">Recently Extracted Assets</h2>
                        <div className="flex items-center gap-4">
                            <button className="glass-button px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border-none cursor-pointer">
                                Recent
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {products.map((product, idx) => (
                            <div key={idx} className="glass-bg p-4 rounded-[2.5rem] flex flex-col gap-6 hover:translate-y-[-4px] transition-all duration-300 group">
                                <div className="relative aspect-[4/3] rounded-[1.5rem] overflow-hidden bg-white shadow-inner">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src={product.imageUrl.split(',')[0]} 
                                        alt={product.productName} 
                                        className="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-slate-900 uppercase tracking-widest border border-white">
                                        Extracted
                                    </div>
                                </div>
                                <div className="px-2 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-1 pr-4">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                Code: {product.codeItem}
                                            </span>
                                            <h3 className="text-lg font-bold text-slate-900 line-clamp-2">
                                                {product.productName}
                                            </h3>
                                        </div>
                                        <span className="text-lg font-bold text-[#f59e0b] whitespace-nowrap">
                                            {product.price}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
