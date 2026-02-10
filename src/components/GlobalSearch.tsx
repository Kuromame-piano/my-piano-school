"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { getStudents, Student } from "../actions/studentActions";

interface GlobalSearchProps {
    onSelect: (studentId: number) => void;
}

export default function GlobalSearch({ onSelect }: GlobalSearchProps) {
    const [query, setQuery] = useState("");
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadStudents();

        // Close on click outside
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadStudents = async () => {
        const data = await getStudents();
        setStudents(data);
    };

    useEffect(() => {
        if (query.trim() === "") {
            setFilteredStudents([]);
            return;
        }
        const lower = query.toLowerCase();
        const filtered = students.filter(s =>
            s.name.toLowerCase().includes(lower) ||
            (s.name.includes(query)) // Japanese exact match
        );
        setFilteredStudents(filtered);
    }, [query, students]);

    const handleSelect = (student: Student) => {
        onSelect(student.id);
        setQuery("");
        setIsOpen(false);
    };

    return (
        <div className="relative w-full max-w-md mb-8 ml-auto" ref={wrapperRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t-muted" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="生徒を検索..."
                    className="w-full pl-10 pr-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-input-text focus:border-input-border-focus focus:bg-input-bg transition-all placeholder:text-t-placeholder shadow-sm"
                />
                {query && (
                    <button
                        onClick={() => setQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-t-muted hover:text-accent"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {isOpen && query && filteredStudents.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card-solid border border-card-border rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="max-h-60 overflow-y-auto divide-y divide-card-border">
                        {filteredStudents.map(student => (
                            <button
                                key={student.id}
                                onClick={() => handleSelect(student)}
                                className="w-full text-left px-4 py-3 hover:bg-accent-bg-hover transition-colors flex items-center gap-3"
                            >
                                <div className={`w-8 h-8 rounded-lg ${student.color} flex items-center justify-center text-white text-xs font-bold`}>
                                    {student.name[0]}
                                </div>
                                <span className="text-sm font-medium text-t-primary">{student.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
