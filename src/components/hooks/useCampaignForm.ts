import { useState } from 'react';
import { saveCampaign } from '../../store/campaignStore';
import { initializeCampaignState } from '../../services/campaignInit';
import { uid } from '../../utils/uid';
import type { Campaign } from '../../types';
import { worldPackToFile, type WorldPack } from '../../worldpacks/lordOfTheMysteries';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';
import { resolvePlayablePc } from '../../services/lotm/createLotmCampaign';

export function useCampaignForm(params: {
    editingCampaign: Campaign | null;
    setEditingCampaign: (c: Campaign | null) => void;
    onDone: () => void;
}) {
    const { editingCampaign, setEditingCampaign, onDone } = params;

    const [name, setName] = useState('');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState('');
    const [loreFile, setLoreFile] = useState<File | null>(null);
    const [loreName, setLoreName] = useState('');
    const [rulesFile, setRulesFile] = useState<File | null>(null);
    const [rulesName, setRulesName] = useState('');
    const [lootFile, setLootFile] = useState<File | null>(null);
    const [lootName, setLootName] = useState('');
    const [appliedPack, setAppliedPack] = useState<WorldPack | null>(null);
    const [selectedPcId, setSelectedPcId] = useState('');

    const resetForm = () => {
        setName(''); setCoverFile(null); setCoverPreview('');
        setLoreFile(null); setLoreName('');
        setRulesFile(null); setRulesName('');
        setLootFile(null); setLootName('');
        setAppliedPack(null);
        setSelectedPcId('');
        setEditingCampaign(null);
    };

    const openCreate = () => { resetForm(); };

    const openEdit = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setName(campaign.name);
        setCoverPreview(campaign.coverImage || '');
        setLoreName(''); setRulesName(''); setLootName('');
        setLoreFile(null); setRulesFile(null); setLootFile(null); setCoverFile(null);
        setAppliedPack(null);
        setSelectedPcId('');
    };

    const handleCoverChange = (file: File) => {
        setCoverFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setCoverPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    // Quick start: fill the same file slots the pickers would, from a bundled pack.
    const applyWorldPack = (pack: WorldPack) => {
        if (!name.trim()) setName(pack.suggestedName);
        setLoreFile(worldPackToFile(pack.lore));
        setLoreName(pack.lore.name);
        setRulesFile(worldPackToFile(pack.rules));
        setRulesName(pack.rules.name);
        setLootFile(worldPackToFile(pack.loot));
        setLootName(pack.loot.name);
        setAppliedPack(pack);
        if (pack.coverAssetPath && !coverFile) {
            setCoverPreview(lotmAssetUrl(pack.coverAssetPath));
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        const isEdit = !!editingCampaign;
        const campaign: Campaign = isEdit
            ? { ...editingCampaign!, name: name.trim(), lastPlayedAt: Date.now() }
            : {
                id: uid(),
                name: name.trim(), coverImage: '',
                createdAt: Date.now(), lastPlayedAt: Date.now(),
            };

        if (coverFile) campaign.coverImage = coverPreview;
        else if (coverPreview) campaign.coverImage = coverPreview;
        else if (isEdit) campaign.coverImage = coverPreview;

        if (appliedPack) {
            campaign.worldPackId = appliedPack.id;
            if (appliedPack.uiSkin) campaign.uiSkin = appliedPack.uiSkin;
        }

        const playerCharacter = appliedPack
            ? resolvePlayablePc(appliedPack, selectedPcId)
            : null;

        await saveCampaign(campaign);
        await initializeCampaignState({
            campaignId: campaign.id,
            loreFile,
            rulesFile,
            lootFile,
            starterText: appliedPack?.starter?.contents ?? null,
            playerCharacter,
            attachLotmVisuals: appliedPack?.id === 'lord-of-the-mysteries',
        });

        resetForm();
        onDone();
    };

    const clearCover = () => { setCoverFile(null); setCoverPreview(''); };

    return {
        name, setName,
        coverFile, coverPreview, handleCoverChange, clearCover,
        loreFile, setLoreFile, loreName, setLoreName,
        rulesFile, setRulesFile, rulesName, setRulesName,
        lootFile, setLootFile, lootName, setLootName,
        applyWorldPack,
        appliedPack,
        selectedPcId,
        setSelectedPcId,
        resetForm, openCreate, openEdit, handleSave,
        editingCampaign,
    };
}
