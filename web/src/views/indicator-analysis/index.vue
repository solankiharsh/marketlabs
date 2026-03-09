<template>
  <div class="chart-container" :class="{ 'theme-dark': isDarkTheme }">
    <div class="chart-header">
      <div class="header-top">
        <div class="header-left">
          <div class="search-section">
            <a-select
              v-model="searchSymbol"
              show-search
              :placeholder="$t('dashboard.indicator.selectSymbol')"
              class="symbol-select"
              dropdownClassName="dark-dropdown"
              :filter-option="filterSymbolOption"
              :not-found-content="null"
              :open="symbolSearchOpen"
              @search="handleSymbolSearch"
              @change="handleSymbolSelect"
              @dropdownVisibleChange="handleDropdownVisibleChange"
            >
              <a-icon slot="suffixIcon" type="search" style="color: #999" />
              <a-select-option
                v-for="item in symbolSuggestions"
                :key="item.value"
                :value="item.value"
              >
                <div class="symbol-option">
                  <a-tag :color="getMarketColor(item.market)" style="margin-right: 8px; margin-bottom: 0;">
                    {{ getMarketName(item.market) }}
                  </a-tag>
                  <span class="symbol-name">{{ item.symbol }}</span>
                  <span v-if="item.name" class="symbol-name-extra">{{ item.name }}</span>
                </div>
              </a-select-option>
              <a-select-option
                key="add-stock-option"
                value="__add_stock_option__"
                class="add-stock-option"
              >
                <div style="width: 100%; text-align: center; padding: 4px 0; color: #1890ff; cursor: pointer;">
                  <a-icon type="plus" style="margin-right: 4px;" />
                  <span>{{ $t('dashboard.analysis.watchlist.add') }}</span>
                </div>
              </a-select-option>
            </a-select>
          </div>

          <div class="timeframe-group">
            <div
              v-for="tf in ['1m','5m','15m','30m','1H','4H','1D','1W']"
              :key="tf"
              class="timeframe-item"
              :class="{ active: timeframe === tf }"
              @click="setTimeframe(tf)"
            >
              {{ tf }}
            </div>
          </div>
        </div>

        <div class="current-symbol" v-if="currentSymbol">
          <div class="symbol-info">
            <span class="symbol-label">{{ currentSymbol }}</span>
            <span class="market-tag">{{ currentMarket }}</span>
          </div>
          <div class="price-info" :class="priceChangeClass">
            <span class="symbol-price">{{ currentPrice }}</span>
            <span class="symbol-change">
              {{ priceChange > 0 ? '+' : '' }}{{ priceChange.toFixed(2) }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-content">
      <div class="chart-main-row">
        <!-- Mobile: show symbol and price info above the K-line chart -->
        <div class="mobile-symbol-price" v-if="currentSymbol">
          <div class="mobile-symbol-info">
            <span class="mobile-market-tag">{{ currentMarket }}</span><span>-</span>
            <span class="mobile-symbol-label">{{ currentSymbol }}</span>
          </div>
          <div class="mobile-price-info" :class="priceChangeClass">
            <span class="mobile-symbol-price">{{ currentPrice }}</span>
            <span class="mobile-symbol-change">
              {{ priceChange > 0 ? '+' : '' }}{{ priceChange.toFixed(2) }}%
            </span>
          </div>
        </div>

        <!-- Chart area wrapper: tabs + chart view -->
        <div class="chart-area-wrapper">
          <div class="chart-view-tabs">
            <span
              class="chart-view-tab"
              :class="{ active: chartViewMode === 'kline' }"
              @click="chartViewMode = 'kline'"
            >
              <a-icon type="line-chart" /> MarketLabs
            </span>
            <span
              class="chart-view-tab"
              :class="{ active: chartViewMode === 'tradingview' }"
              @click="chartViewMode = 'tradingview'"
            >
              <a-icon type="stock" /> TradingView
            </span>
          </div>

          <kline-chart
            v-show="chartViewMode === 'kline'"
            ref="klineChart"
            :symbol="currentSymbol"
            :market="currentMarket"
            :timeframe="timeframe"
            :theme="chartTheme"
            :activeIndicators="activeIndicators"
            :realtimeEnabled="realtimeEnabled"
            @price-change="handlePriceChange"
            @retry="handleChartRetry"
            @indicator-toggle="handleIndicatorToggle"
          />

          <div v-show="chartViewMode === 'tradingview'" class="tradingview-container">
            <iframe
              v-if="tradingViewSymbol"
              :key="tradingViewSymbol + '-' + chartTheme"
              :src="tradingViewEmbedUrl"
              class="tradingview-iframe"
              frameborder="0"
              allowtransparency="true"
              allowfullscreen
            ></iframe>
            <div v-else class="tradingview-empty">
              <a-icon type="stock" style="font-size: 48px; margin-bottom: 12px;" />
              <p>Select a symbol to view TradingView chart</p>
            </div>
          </div>
        </div>

        <div class="chart-right">
          <div class="indicators-panel">
            <div class="panel-header">
              <span>{{ $t('dashboard.indicator.panel.title') }}</span>
              <div style="display: flex; align-items: center; margin-left: auto; gap: 8px;">
                <!-- Mobile: create indicator button -->
                <a-button
                  v-if="isMobile"
                  type="primary"
                  size="small"
                  icon="plus"
                  @click="handleCreateIndicator"
                  class="mobile-header-create-btn"
                >
                  {{ $t('dashboard.indicator.create') }}
                </a-button>
                <!-- Realtime update toggle -->
                <a-tooltip :title="realtimeEnabled ? $t('dashboard.indicator.panel.realtimeOn') : $t('dashboard.indicator.panel.realtimeOff')">
                  <a-button
                    type="text"
                    @click="toggleRealtime"
                    class="realtime-toggle-btn"
                    :class="{ 'active': realtimeEnabled }"
                  >
                    <a-icon :type="realtimeEnabled ? 'sync' : 'pause-circle'" :spin="realtimeEnabled" />
                  </a-button>
                </a-tooltip>
              </div>
            </div>

            <div class="panel-body">
              <!-- Desktop: two sections each taking half -->
              <template v-if="!isMobile">
                <!-- My created indicators -->
                <div class="indicator-section" :class="{ 'section-empty': customIndicators.length === 0 }">
                  <div class="section-label">
                    <div class="section-label-left" @click="toggleCustomSection">
                      <a-icon :type="customSectionCollapsed ? 'right' : 'down'" class="collapse-icon" />
                      <span>{{ $t('dashboard.indicator.section.myCreated') }} ({{ customIndicators.length }})</span>
                    </div>
                    <a-button
                      type="primary"
                      size="small"
                      icon="plus"
                      @click.stop="handleCreateIndicator"
                      class="create-indicator-btn"
                    >
                      {{ $t('dashboard.indicator.create') }}
                    </a-button>
                  </div>
                  <div v-show="!customSectionCollapsed" class="section-content custom-scrollbar">
                    <div
                      v-for="indicator in customIndicators"
                      :key="'custom-' + indicator.id"
                      :class="['indicator-card', { 'indicator-active': isIndicatorActive('custom-' + indicator.id) }]"
                      @click="toggleIndicator(indicator, 'custom')"
                    >
                      <div class="card-content">
                        <div class="card-header">
                          <span class="card-name">{{ indicator.name }}</span>
                          <div class="card-actions">
                            <!-- Edit icon -->
                            <a-tooltip :title="$t('dashboard.indicator.action.edit')">
                              <a-icon
                                type="edit"
                                class="action-icon edit-icon"
                                @click.stop="handleEditIndicator(indicator)"
                              />
                            </a-tooltip>
                            <!-- Delete icon -->
                            <a-tooltip :title="$t('dashboard.indicator.action.delete')">
                              <a-icon
                                type="delete"
                                class="action-icon delete-icon"
                                @click.stop="handleDeleteIndicator(indicator)"
                              />
                            </a-tooltip>
                            <!-- Start/stop toggle -->
                            <a-tooltip :title="isIndicatorActive('custom-' + indicator.id) ? $t('dashboard.indicator.action.stop') : $t('dashboard.indicator.action.start')">
                              <a-icon
                                :type="isIndicatorActive('custom-' + indicator.id) ? 'pause-circle' : 'play-circle'"
                                :class="['action-icon', 'toggle-icon', { active: isIndicatorActive('custom-' + indicator.id) }]"
                                @click.stop="toggleIndicator(indicator, 'custom')"
                              />
                            </a-tooltip>
                            <!-- Backtest button -->
                            <a-tooltip :title="$t('dashboard.indicator.backtest.title')">
                              <a-icon
                                type="experiment"
                                class="action-icon backtest-icon"
                                @click.stop="handleOpenBacktest(indicator)"
                              />
                            </a-tooltip>
                            <!-- Backtest history -->
                            <a-tooltip :title="$t('dashboard.indicator.backtest.historyTitle')">
                              <a-icon
                                type="clock-circle"
                                class="action-icon backtest-history-icon"
                                @click.stop="handleOpenBacktestHistory(indicator)"
                              />
                            </a-tooltip>
                            <!-- Publish to community -->
                            <a-tooltip :title="indicator.publish_to_community ? $t('dashboard.indicator.action.unpublish') : $t('dashboard.indicator.action.publish')">
                              <a-icon
                                :type="indicator.publish_to_community ? 'cloud' : 'cloud-upload'"
                                :class="['action-icon', 'publish-icon', { published: indicator.publish_to_community }]"
                                @click.stop="handlePublishIndicator(indicator)"
                              />
                            </a-tooltip>
                          </div>
                        </div>
                        <span class="card-desc">{{ indicator.description || '' }}</span>
                      </div>
                    </div>
                    <!-- Empty state -->
                    <div v-if="customIndicators.length === 0" class="empty-indicators">
                      <a-icon type="info-circle" />
                      <span>{{ $t('dashboard.indicator.empty') }}</span>
                    </div>
                  </div>
                </div>

                <!-- My purchased indicators -->
                <div class="indicator-section" :class="{ 'section-empty': purchasedIndicators.length === 0 }">
                  <div class="section-label">
                    <div class="section-label-left" @click="purchasedSectionCollapsed = !purchasedSectionCollapsed">
                      <a-icon :type="purchasedSectionCollapsed ? 'right' : 'down'" class="collapse-icon" />
                      <span>{{ $t('dashboard.indicator.section.purchased') }} ({{ purchasedIndicators.length }})</span>
                    </div>
                  </div>
                  <div v-show="!purchasedSectionCollapsed" class="section-content custom-scrollbar">
                    <div
                      v-for="indicator in purchasedIndicators"
                      :key="'purchased-' + indicator.id"
                      :class="['indicator-card', 'purchased-indicator', { 'indicator-active': isIndicatorActive('purchased-' + indicator.id) }]"
                      @click="toggleIndicator(indicator, 'purchased')"
                    >
                      <div class="card-content">
                        <div class="card-header">
                          <span class="card-name">
                            <a-icon type="shopping" class="purchased-icon" />
                            {{ indicator.name }}
                          </span>
                          <div class="card-actions">
                            <!-- Purchased indicators: can only start/stop and backtest, cannot edit or delete -->
                            <a-tooltip :title="isIndicatorActive('purchased-' + indicator.id) ? $t('dashboard.indicator.action.stop') : $t('dashboard.indicator.action.start')">
                              <a-icon
                                :type="isIndicatorActive('purchased-' + indicator.id) ? 'pause-circle' : 'play-circle'"
                                :class="['action-icon', 'toggle-icon', { active: isIndicatorActive('purchased-' + indicator.id) }]"
                                @click.stop="toggleIndicator(indicator, 'purchased')"
                              />
                            </a-tooltip>
                            <a-tooltip :title="$t('dashboard.indicator.backtest.title')">
                              <a-icon
                                type="experiment"
                                class="action-icon backtest-icon"
                                @click.stop="handleOpenBacktest(indicator)"
                              />
                            </a-tooltip>
                            <a-tooltip :title="$t('dashboard.indicator.backtest.historyTitle')">
                              <a-icon
                                type="clock-circle"
                                class="action-icon backtest-history-icon"
                                @click.stop="handleOpenBacktestHistory(indicator)"
                              />
                            </a-tooltip>
                          </div>
                        </div>
                        <span class="card-desc">{{ indicator.description || '' }}</span>
                      </div>
                    </div>
                    <!-- Empty state -->
                    <div v-if="purchasedIndicators.length === 0" class="empty-indicators">
                      <a-icon type="shopping" />
                      <span>{{ $t('dashboard.indicator.emptyPurchased') }}</span>
                    </div>
                  </div>
                </div>

              </template>

              <!-- Mobile: show indicator list -->
              <template v-else>
                <div class="mobile-tab-content">
                  <div class="section-content custom-scrollbar">
                    <div
                      v-for="indicator in customIndicators"
                      :key="'custom-' + indicator.id"
                      :class="['indicator-card', { 'indicator-active': isIndicatorActive('custom-' + indicator.id) }]"
                      @click="toggleIndicator(indicator, 'custom')"
                    >
                      <div class="card-content">
                        <div class="card-header">
                          <span class="card-name">{{ indicator.name }}</span>
                          <div class="card-actions">
                            <!-- Edit icon -->
                            <a-tooltip :title="$t('dashboard.indicator.action.edit')">
                              <a-icon
                                type="edit"
                                class="action-icon edit-icon"
                                @click.stop="handleEditIndicator(indicator)"
                              />
                            </a-tooltip>
                            <!-- Delete icon -->
                            <a-tooltip :title="$t('dashboard.indicator.action.delete')">
                              <a-icon
                                type="delete"
                                class="action-icon delete-icon"
                                @click.stop="handleDeleteIndicator(indicator)"
                              />
                            </a-tooltip>
                            <!-- Start/stop toggle -->
                            <a-tooltip :title="isIndicatorActive('custom-' + indicator.id) ? $t('dashboard.indicator.action.stop') : $t('dashboard.indicator.action.start')">
                              <a-icon
                                :type="isIndicatorActive('custom-' + indicator.id) ? 'pause-circle' : 'play-circle'"
                                :class="['action-icon', 'toggle-icon', { active: isIndicatorActive('custom-' + indicator.id) }]"
                                @click.stop="toggleIndicator(indicator, 'custom')"
                              />
                            </a-tooltip>
                            <!-- Backtest button -->
                            <a-tooltip :title="$t('dashboard.indicator.backtest.title')">
                              <a-icon
                                type="experiment"
                                class="action-icon backtest-icon"
                                @click.stop="handleOpenBacktest(indicator)"
                              />
                            </a-tooltip>
                            <!-- Backtest history -->
                            <a-tooltip :title="$t('dashboard.indicator.backtest.historyTitle')">
                              <a-icon
                                type="clock-circle"
                                class="action-icon backtest-history-icon"
                                @click.stop="handleOpenBacktestHistory(indicator)"
                              />
                            </a-tooltip>
                            <!-- Publish to community -->
                            <a-tooltip :title="indicator.publish_to_community ? $t('dashboard.indicator.action.unpublish') : $t('dashboard.indicator.action.publish')">
                              <a-icon
                                :type="indicator.publish_to_community ? 'cloud' : 'cloud-upload'"
                                :class="['action-icon', 'publish-icon', { published: indicator.publish_to_community }]"
                                @click.stop="handlePublishIndicator(indicator)"
                              />
                            </a-tooltip>
                          </div>
                        </div>
                        <span class="card-desc">{{ indicator.description || '' }}</span>
                      </div>
                    </div>
                    <!-- Empty state -->
                    <div v-if="customIndicators.length === 0" class="empty-indicators">
                      <a-icon type="info-circle" />
                      <span>{{ $t('dashboard.indicator.empty') }}</span>
                    </div>
                  </div>
                </div>

              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Indicator editor modal -->
      <indicator-editor
        ref="indicatorEditor"
        :visible="showIndicatorEditor"
        :indicator="editingIndicator"
        :userId="userId"
        @run="handleRunIndicator"
        @save="handleSaveIndicator"
        @cancel="showIndicatorEditor = false; editingIndicator = null"
      />

      <!-- Backtest modal -->
      <backtest-modal
        :visible="showBacktestModal"
        :userId="userId"
        :indicator="backtestIndicator"
        :symbol="selectedSymbol"
        :market="selectedMarket"
        :timeframe="selectedTimeframe"
        @cancel="showBacktestModal = false; backtestIndicator = null"
      />

      <!-- Indicator parameter configuration modal -->
      <a-modal
        :visible="showParamsModal"
        :title="$t('dashboard.indicator.paramsConfig.title')"
        :confirmLoading="loadingParams"
        @ok="confirmIndicatorParams"
        @cancel="cancelIndicatorParams"
        @afterClose="handleParamsModalAfterClose"
        :width="500"
        :maskClosable="false"
        :keyboard="false"
      >
        <div v-if="pendingIndicator" class="params-config-modal">
          <div class="indicator-info">
            <span class="indicator-name">{{ pendingIndicator.name }}</span>
          </div>
          <a-divider />
          <div v-if="indicatorParams.length > 0" class="params-form">
            <div v-for="param in indicatorParams" :key="param.name" class="param-item">
              <div class="param-header">
                <label class="param-label">{{ param.name }}</label>
                <a-tooltip v-if="param.description" :title="param.description">
                  <a-icon type="question-circle" style="color: #999; margin-left: 4px;" />
                </a-tooltip>
              </div>
              <!-- Integer type -->
              <a-input-number
                v-if="param.type === 'int'"
                v-model="indicatorParamValues[param.name]"
                :precision="0"
                style="width: 100%;"
              />
              <!-- Float type -->
              <a-input-number
                v-else-if="param.type === 'float'"
                v-model="indicatorParamValues[param.name]"
                :precision="4"
                style="width: 100%;"
              />
              <!-- Boolean type -->
              <a-switch
                v-else-if="param.type === 'bool'"
                v-model="indicatorParamValues[param.name]"
              />
              <!-- String type -->
              <a-input
                v-else
                v-model="indicatorParamValues[param.name]"
              />
            </div>
          </div>
          <a-empty v-else :description="$t('dashboard.indicator.paramsConfig.noParams')" />
        </div>
      </a-modal>

      <!-- Backtest history drawer -->
      <backtest-history-drawer
        :visible="showBacktestHistoryDrawer"
        :userId="userId"
        :indicatorId="backtestHistoryIndicator ? backtestHistoryIndicator.id : null"
        :symbol="selectedSymbol"
        :market="selectedMarket"
        :timeframe="selectedTimeframe"
        :isMobile="isMobile"
        @cancel="showBacktestHistoryDrawer = false; backtestHistoryIndicator = null"
        @view="handleViewBacktestRun"
      />

      <!-- Backtest run details -->
      <backtest-run-viewer
        :visible="showBacktestRunViewer"
        :run="selectedBacktestRun"
        @cancel="showBacktestRunViewer = false; selectedBacktestRun = null"
      />

      <!-- Publish to community modal -->
      <a-modal
        :title="publishIndicator && publishIndicator.publish_to_community ? $t('dashboard.indicator.publish.editTitle') : $t('dashboard.indicator.publish.title')"
        :visible="showPublishModal"
        @ok="handleConfirmPublish"
        @cancel="showPublishModal = false; publishIndicator = null"
        :confirmLoading="publishing"
        width="500px"
        :okText="publishIndicator && publishIndicator.publish_to_community ? $t('dashboard.indicator.publish.update') : $t('dashboard.indicator.publish.confirm')"
        :cancelText="$t('common.cancel')"
      >
        <a-form-model ref="publishForm" :model="publishForm" :rules="publishRules" layout="vertical">
          <a-alert
            type="info"
            show-icon
            :message="$t('dashboard.indicator.publish.hint')"
            style="margin-bottom: 16px;"
          />
          <a-form-model-item :label="$t('dashboard.indicator.publish.pricingType')" prop="pricingType">
            <a-radio-group v-model="publishPricingType">
              <a-radio value="free">{{ $t('dashboard.indicator.publish.free') }}</a-radio>
              <a-radio value="paid">{{ $t('dashboard.indicator.publish.paid') }}</a-radio>
            </a-radio-group>
          </a-form-model-item>
          <a-form-model-item
            v-if="publishPricingType === 'paid'"
            :label="$t('dashboard.indicator.publish.price')"
            prop="price"
          >
            <a-input-number
              v-model="publishPrice"
              :min="1"
              :max="10000"
              :precision="0"
              style="width: 200px;"
            />
            <span style="margin-left: 8px;">{{ $t('community.credits') }}</span>
          </a-form-model-item>
          <a-form-model-item v-if="publishPricingType === 'paid'" :label="$t('dashboard.indicator.publish.vipFree')">
            <a-switch v-model="publishVipFree" />
            <div style="margin-top: 6px; color: rgba(0,0,0,0.45); font-size: 12px;">
              {{ $t('dashboard.indicator.publish.vipFreeHint') }}
            </div>
          </a-form-model-item>
          <a-form-model-item :label="$t('dashboard.indicator.publish.description')" prop="description">
            <a-textarea
              v-model="publishDescription"
              :placeholder="$t('dashboard.indicator.publish.descriptionPlaceholder')"
              :rows="4"
              :maxLength="500"
            />
          </a-form-model-item>
          <div v-if="publishIndicator && publishIndicator.publish_to_community" style="margin-top: 16px;">
            <a-button type="danger" ghost @click="handleUnpublish" :loading="unpublishing">
              <a-icon type="close-circle" />
              {{ $t('dashboard.indicator.publish.unpublish') }}
            </a-button>
          </div>
        </a-form-model>
      </a-modal>

      <!-- Add stock modal -->
      <a-modal
        :title="$t('dashboard.analysis.modal.addStock.title')"
        :visible="showAddStockModal"
        @ok="handleAddStock"
        @cancel="handleCloseAddStockModal"
        :confirmLoading="addingStock"
        width="600px"
        :okText="$t('dashboard.analysis.modal.addStock.confirm')"
        :cancelText="$t('dashboard.analysis.modal.addStock.cancel')"
      >
        <div class="add-stock-modal-content">
          <!-- Tab labels -->
          <a-tabs v-model="selectedMarketTab" @change="handleMarketTabChange" class="market-tabs">
            <a-tab-pane
              v-for="marketType in marketTypes"
              :key="marketType.value"
              :tab="$t(marketType.i18nKey || `dashboard.analysis.market.${marketType.value}`)"
            >
            </a-tab-pane>
          </a-tabs>

          <!-- Search/input box (combined search and manual input) -->
          <div class="symbol-search-section">
            <a-input-search
              v-model="symbolSearchKeyword"
              :placeholder="$t('dashboard.analysis.modal.addStock.searchOrInputPlaceholder')"
              @search="handleSearchOrInput"
              @change="handleSymbolSearchInput"
              :loading="searchingSymbols"
              size="large"
              allow-clear
            >
              <a-button slot="enterButton" type="primary" icon="search">
                {{ $t('dashboard.analysis.modal.addStock.search') }}
              </a-button>
            </a-input-search>
          </div>

          <!-- Search results -->
          <div v-if="symbolSearchResults.length > 0" class="search-results-section">
            <div class="section-title">
              <a-icon type="search" style="margin-right: 4px;" />
              {{ $t('dashboard.analysis.modal.addStock.searchResults') }}
            </div>
            <a-list
              :data-source="symbolSearchResults"
              :loading="searchingSymbols"
              size="small"
              class="symbol-list"
            >
              <a-list-item slot="renderItem" slot-scope="item" class="symbol-list-item" @click="selectSymbol(item)">
                <a-list-item-meta>
                  <template slot="title">
                    <div class="symbol-item-content">
                      <span class="symbol-code">{{ item.symbol }}</span>
                      <span class="symbol-name">{{ item.name }}</span>
                      <a-tag v-if="item.exchange" size="small" color="blue" style="margin-left: 8px;">
                        {{ item.exchange }}
                      </a-tag>
                    </div>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </a-list>
          </div>

          <!-- Popular symbols -->
          <div class="hot-symbols-section">
            <div class="section-title">
              <a-icon type="fire" style="color: #ff4d4f; margin-right: 4px;" />
              {{ $t('dashboard.analysis.modal.addStock.hotSymbols') }}
            </div>
            <a-spin :spinning="loadingHotSymbols">
              <a-list
                v-if="hotSymbols.length > 0"
                :data-source="hotSymbols"
                size="small"
                class="symbol-list"
              >
                <a-list-item slot="renderItem" slot-scope="item" class="symbol-list-item" @click="selectSymbol(item)">
                  <a-list-item-meta>
                    <template slot="title">
                      <div class="symbol-item-content">
                        <span class="symbol-code">{{ item.symbol }}</span>
                        <span class="symbol-name">{{ item.name }}</span>
                        <a-tag v-if="item.exchange" size="small" color="orange" style="margin-left: 8px;">
                          {{ item.exchange }}
                        </a-tag>
                      </div>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </a-list>
              <a-empty v-else :description="$t('dashboard.analysis.modal.addStock.noHotSymbols')" :image="false" />
            </a-spin>
          </div>

          <!-- Selected symbol display -->
          <div v-if="selectedSymbolForAdd" class="selected-symbol-section">
            <a-alert
              :message="$t('dashboard.analysis.modal.addStock.selectedSymbol')"
              type="info"
              show-icon
              closable
              @close="selectedSymbolForAdd = null"
            >
              <template slot="description">
                <div class="selected-symbol-info">
                  <a-tag :color="getMarketColor(selectedSymbolForAdd.market)" style="margin-right: 8px;">
                    {{ $t(`dashboard.analysis.market.${selectedSymbolForAdd.market}`) }}
                  </a-tag>
                  <strong>{{ selectedSymbolForAdd.symbol }}</strong>
                  <span v-if="selectedSymbolForAdd.name" style="color: #999; margin-left: 8px;">{{ selectedSymbolForAdd.name }}</span>
                  <span v-else style="color: #999; margin-left: 8px; font-style: italic;">{{ $t('dashboard.analysis.modal.addStock.nameWillBeFetched') }}</span>
                </div>
              </template>
            </a-alert>
          </div>
        </div>
      </a-modal>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, getCurrentInstance, watch } from 'vue'
import { mapState } from 'vuex'
import { message, Modal } from 'ant-design-vue'
import request from '@/utils/request'
import { getWatchlist, addWatchlist, searchSymbols, getHotSymbols, getMarketTypes } from '@/api/market'
import { getUserInfo } from '@/api/login'
import IndicatorEditor from '@/views/indicator-analysis/components/IndicatorEditor.vue'
import KlineChart from '@/views/indicator-analysis/components/KlineChart.vue'
import BacktestModal from '@/views/indicator-analysis/components/BacktestModal.vue'
import BacktestHistoryDrawer from '@/views/indicator-analysis/components/BacktestHistoryDrawer.vue'
import BacktestRunViewer from '@/views/indicator-analysis/components/BacktestRunViewer.vue'

export default {
  name: 'DashboardIndicator',
  components: {
    IndicatorEditor,
    KlineChart,
    BacktestModal,
    BacktestHistoryDrawer,
    BacktestRunViewer
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    // Chart theme - fetched from store
    chartTheme () {
      // Map both 'dark' and 'realdark' to 'dark', others to 'light'
      return (this.navTheme === 'dark' || this.navTheme === 'realdark') ? 'dark' : 'light'
    },
    // Determine if dark theme is active (used for adding class names)
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    }
  },
  setup () {
    // Get current component instance proxy for dynamic access to $t
    const instance = getCurrentInstance()
    const { proxy } = instance || {}

    // User info (local single-user mode: default userId=1, prevents page from failing to load watchlist/indicators when not logged in)
    const userId = ref(1)
    const loadingUserInfo = ref(false)

    // Chart view mode: 'kline' or 'tradingview'
    const chartViewMode = ref('kline')

    // Map market + symbol to TradingView symbol format
    const tradingViewSymbol = computed(() => {
      if (!currentSymbol.value || !currentMarket.value) return ''
      const market = currentMarket.value
      let symbol = currentSymbol.value

      // Clean up symbol based on market
      if (market === 'Crypto') {
        // BTC/USDT -> BTCUSDT
        symbol = symbol.replace('/', '')
        return `BINANCE:${symbol}`
      } else if (market === 'IndianStock') {
        // TCS.NS -> TCS, RELIANCE.NS -> RELIANCE, NIFTY50 -> NIFTY
        symbol = symbol.replace(/\.(NS|BO|NSE|BSE)$/i, '')
        return `NSE:${symbol}`
      } else if (market === 'Forex') {
        // EUR/USD -> EURUSD
        symbol = symbol.replace('/', '')
        return `FX:${symbol}`
      } else if (market === 'Futures') {
        return `CME:${symbol}`
      } else {
        // USStock: AAPL stays AAPL
        return `NASDAQ:${symbol}`
      }
    })

    // TradingView embed URL using their embeddable mini chart / symbol overview
    const tradingViewEmbedUrl = computed(() => {
      if (!tradingViewSymbol.value) return ''
      const theme = (proxy && proxy.$store && proxy.$store.state.app.theme === 'dark') || (proxy && proxy.$store && proxy.$store.state.app.theme === 'realdark') ? 'dark' : 'light'
      const sym = encodeURIComponent(tradingViewSymbol.value)
      return 'https://s.tradingview.com/widgetembed/?hideideas=1&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en' +
        '&symbol=' + sym +
        '&interval=15' +
        '&theme=' + theme +
        '&style=1' +
        '&timezone=exchange' +
        '&withdateranges=1' +
        '&hide_side_toolbar=0' +
        '&allow_symbol_change=1' +
        '&save_image=1' +
        '&studies=%5B%5D' +
        '&utm_source=marketlabs' +
        '&utm_medium=widget' +
        '&utm_campaign=chart'
    })

    // Search related
    const searchSymbol = ref(undefined)
    const symbolSuggestions = ref([])
    const watchlist = ref([]) // Watchlist
    const loadingWatchlist = ref(false)
    const symbolSearchValue = ref('') // Search input value
    const symbolSearchOpen = ref(false) // Whether dropdown is open

    // Add stock modal related
    const showAddStockModal = ref(false)
    const addingStock = ref(false)
    const selectedMarketTab = ref('') // Currently selected market type tab
    const symbolSearchKeyword = ref('') // Search keyword
    const symbolSearchResults = ref([]) // Search results
    const searchingSymbols = ref(false) // Whether searching is in progress
    const hotSymbols = ref([]) // Popular symbols list
    const loadingHotSymbols = ref(false) // Whether popular symbols are loading
    const selectedSymbolForAdd = ref(null) // Selected symbol (for adding)
    const searchTimer = ref(null) // Search debounce timer
    const marketTypes = ref([]) // Market type list
    const hasSearched = ref(false) // Whether a search has been performed (for showing no-results prompt)

    const currentSymbol = ref('')
    const currentMarket = ref('')
    const currentPrice = ref('--')
    const priceChange = ref(0)

    const priceChangeClass = computed(() => {
      return priceChange.value > 0 ? 'color-up' : priceChange.value < 0 ? 'color-down' : ''
    })

    const timeframe = ref('1D')
    const activeIndicators = ref([])
    const isMobile = ref(false)

    // SMA and EMA moving average group definitions (deprecated, kept for compatibility checks)
    const smaGroup = [
      { id: 'sma5', name: 'SMA5 (5-day MA)', shortName: 'SMA5', type: 'line', defaultParams: { length: 5 } },
      { id: 'sma10', name: 'SMA10 (10-day MA)', shortName: 'SMA10', type: 'line', defaultParams: { length: 10 } },
      { id: 'sma20', name: 'SMA20 (20-day MA)', shortName: 'SMA20', type: 'line', defaultParams: { length: 20 } },
      { id: 'sma30', name: 'SMA30 (30-day MA)', shortName: 'SMA30', type: 'line', defaultParams: { length: 30 } }
    ]

    const emaGroup = [
      { id: 'ema5', name: 'EMA5 (5-day EMA)', shortName: 'EMA5', type: 'line', defaultParams: { length: 5 } },
      { id: 'ema10', name: 'EMA10 (10-day EMA)', shortName: 'EMA10', type: 'line', defaultParams: { length: 10 } },
      { id: 'ema20', name: 'EMA20 (20-day EMA)', shortName: 'EMA20', type: 'line', defaultParams: { length: 20 } },
      { id: 'ema30', name: 'EMA30 (30-day EMA)', shortName: 'EMA30', type: 'line', defaultParams: { length: 30 } }
    ]

    // Indicators fetched from database
    const customIndicators = ref([]) // My created indicators (is_buy=0)
    const purchasedIndicators = ref([]) // My purchased indicators (is_buy=1)
    const loadingIndicators = ref(false)

    // Indicator parameter configuration modal
    const showParamsModal = ref(false)
    const pendingIndicator = ref(null) // Indicator pending execution
    const pendingSource = ref('') // Source of the pending indicator (custom/purchased)
    const indicatorParams = ref([]) // Indicator parameter declarations
    const indicatorParamValues = ref({}) // User-configured parameter values
    const loadingParams = ref(false)
    // Save each indicator's parameter values (key: indicatorId, value: { paramName: paramValue })
    const savedIndicatorParams = ref({})

    // Collapse state
    const customSectionCollapsed = ref(false) // Whether the "my created indicators" section is collapsed
    const purchasedSectionCollapsed = ref(false) // Whether the "my purchased indicators" section is collapsed

    // Indicator editor related
    const showIndicatorEditor = ref(false)
    const editingIndicator = ref(null)

    // Backtest related
    const showBacktestModal = ref(false)
    const backtestIndicator = ref(null)

    // Backtest history related
    const showBacktestHistoryDrawer = ref(false)
    const backtestHistoryIndicator = ref(null)
    const showBacktestRunViewer = ref(false)
    const selectedBacktestRun = ref(null)

    // Publish to community related
    const showPublishModal = ref(false)
    const publishIndicator = ref(null)
    const publishing = ref(false)
    const unpublishing = ref(false)
    // Use independent ref variables to ensure v-model works properly
    const publishPricingType = ref('free')
    const publishPrice = ref(10)
    const publishDescription = ref('')
    const publishVipFree = ref(false)
    const publishRules = {
      price: [
        { required: true, message: 'Please enter price', trigger: 'blur', type: 'number' }
      ]
    }

    // Realtime update settings
    const realtimeEnabled = ref(false) // Whether realtime updates are enabled

    // Handle price change event (received from KlineChart component)
    const handlePriceChange = ({ price, change }) => {
      currentPrice.value = price
      priceChange.value = change
    }

    // Handle chart retry event
    const handleChartRetry = () => {
      // KlineChart component handles retry itself, additional logic can be added here
    }

    // --- Indicator definitions (deprecated, kept for compatibility) ---
    const trendIndicators = ref([])
    const oscillatorIndicators = ref([])

    // --- Interaction logic ---

    const setTimeframe = (tf) => {
      timeframe.value = tf
      // KlineChart component will auto-load data via watch on timeframe
    }

    const formatParams = (params) => {
      if (!params) return ''
      return Object.values(params).join(', ')
    }

    // Load user info
    const loadUserInfo = async () => {
      loadingUserInfo.value = true
      try {
        // Get store instance
        const instance = getCurrentInstance()
        const store = instance?.proxy?.$store

        // First try to get from store
        const storeUserInfo = store?.getters?.userInfo || {}
        if (storeUserInfo && storeUserInfo.email) {
          userId.value = storeUserInfo.id
          loadingUserInfo.value = false
          // Load data
          loadWatchlist()
          // Load indicator list
          loadIndicators()
          return
        }

        // If not in store, fetch from API
        const res = await getUserInfo()
        if (res && res.code === 1 && res.data) {
          userId.value = res.data.id
          // Update store
          if (store) {
            store.commit('SET_INFO', res.data)
          }
          // Load data
          loadWatchlist()
          // Load indicator list
          loadIndicators()
        }
      } catch (error) {
      } finally {
        loadingUserInfo.value = false
      }
    }

    // Load watchlist
    const loadWatchlist = async () => {
      if (!userId.value) return
      loadingWatchlist.value = true
      try {
        const res = await getWatchlist({ userid: userId.value })
        if (res && res.code === 1 && res.data) {
          watchlist.value = res.data.map(item => ({
            ...item,
            label: item.symbol + (item.name ? ` (${item.name})` : ''),
            value: `${item.market}:${item.symbol}`
          }))
          // Update symbolSuggestions
          updateSymbolSuggestions()

          // If watchlist has items, auto-select the most recently added one (first in array, since backend sorts by createtime desc)
          if (watchlist.value.length > 0 && !currentSymbol.value) {
            const latestSymbol = watchlist.value[0]
            currentMarket.value = latestSymbol.market
            currentSymbol.value = latestSymbol.symbol
            searchSymbol.value = latestSymbol.value
          }
        }
      } catch (error) {
        message.error(proxy.$t('dashboard.indicator.error.loadWatchlistFailed'))
      } finally {
        loadingWatchlist.value = false
      }
    }

    // Update search suggestions (based on watchlist)
    const updateSymbolSuggestions = () => {
      if (symbolSearchValue.value) {
        // If there is search input, filter watchlist
        symbolSuggestions.value = watchlist.value.filter(item =>
          item.symbol.toLowerCase().includes(symbolSearchValue.value.toLowerCase()) ||
          (item.name && item.name.toLowerCase().includes(symbolSearchValue.value.toLowerCase()))
        )
      } else {
        // When no search input, show all watchlist items
        symbolSuggestions.value = watchlist.value
      }
    }

    const handleSymbolSearch = (value) => {
      symbolSearchValue.value = value
      // If no watchlist items and user has typed something, open dropdown
      if (watchlist.value.length === 0 && value) {
        symbolSearchOpen.value = true
      }
      updateSymbolSuggestions()
    }

    const handleDropdownVisibleChange = (open) => {
      symbolSearchOpen.value = open
      // If dropdown is closed, clear search value
      if (!open) {
        symbolSearchValue.value = ''
      }
    }

    const handleSymbolSelect = (value) => {
      // If it's a hint option, do nothing
      if (value === '__empty_watchlist_hint__') {
        return
      }
      // If it's the add stock option
      if (value === '__add_stock_option__') {
        showAddStockModal.value = true
        // Reset selected item to avoid displaying internal value
        setTimeout(() => {
          searchSymbol.value = undefined
        }, 0)
        return
      }

      // Find the selected item from the watchlist
      let selected = watchlist.value.find(s => s.value === value)

      // If not found, try to find in suggestions list
      if (!selected) {
        selected = symbolSuggestions.value.find(s => s.value === value)
      }

      // If still not found, try to parse format "market:symbol"
      if (!selected && value.includes(':')) {
        const [market, symbol] = value.split(':')
        selected = { market, symbol, value }
      }

      if (selected) {
        currentMarket.value = selected.market
        currentSymbol.value = selected.symbol
        searchSymbol.value = selected.value // Display the selected value
        // KlineChart component will auto-load data via watch on symbol and market
      }
    }

    // Filter options (for search)
    const filterSymbolOption = (input, option) => {
      const value = option.componentOptions?.propsData?.value || ''
      // If it's a hint option or add button, always show
      if (value === '__empty_watchlist_hint__' || value === '__add_stock_option__') {
        return true
      }
      return value.toLowerCase().includes(input.toLowerCase())
    }

    // Load market type list
    const loadMarketTypes = async () => {
      try {
        const res = await getMarketTypes()
        if (res && res.code === 1 && res.data && Array.isArray(res.data)) {
          marketTypes.value = res.data.map(item => ({
            value: item.value,
            i18nKey: item.i18nKey || `dashboard.analysis.market.${item.value}`
          }))
        } else if (res && res.code === 1 && res.data && typeof res.data === 'object') {
          marketTypes.value = Object.keys(res.data).map(key => ({
            value: key,
            i18nKey: `dashboard.analysis.market.${key}`
          }))
        } else {
          // Order: USStock > Crypto > Forex > Futures
          marketTypes.value = [
            { value: 'USStock', i18nKey: 'dashboard.analysis.market.USStock' },
            { value: 'Crypto', i18nKey: 'dashboard.analysis.market.Crypto' },
            { value: 'Forex', i18nKey: 'dashboard.analysis.market.Forex' },
            { value: 'Futures', i18nKey: 'dashboard.analysis.market.Futures' }
          ]
        }

        // Initialize selected market type tab
        if (marketTypes.value.length > 0 && !selectedMarketTab.value) {
          selectedMarketTab.value = marketTypes.value[0].value
        }
      } catch (error) {
        // Order: USStock > Crypto > Forex > Futures
        marketTypes.value = [
          { value: 'USStock', i18nKey: 'dashboard.analysis.market.USStock' },
          { value: 'Crypto', i18nKey: 'dashboard.analysis.market.Crypto' },
          { value: 'Forex', i18nKey: 'dashboard.analysis.market.Forex' },
          { value: 'Futures', i18nKey: 'dashboard.analysis.market.Futures' }
        ]
      }
    }

    // Close add stock modal
    const handleCloseAddStockModal = () => {
      showAddStockModal.value = false
      selectedSymbolForAdd.value = null
      symbolSearchKeyword.value = ''
      symbolSearchResults.value = []
      hasSearched.value = false
      selectedMarketTab.value = marketTypes.value.length > 0 ? marketTypes.value[0].value : ''
    }

    // Market type tab switch
    const handleMarketTabChange = (activeKey) => {
      selectedMarketTab.value = activeKey
      symbolSearchKeyword.value = ''
      symbolSearchResults.value = []
      selectedSymbolForAdd.value = null
      hasSearched.value = false
      // Load popular symbols for this market type
      loadHotSymbols(activeKey)
    }

    // Symbol search input change (debounced)
    const handleSymbolSearchInput = (e) => {
      const keyword = e.target.value
      symbolSearchKeyword.value = keyword

      // Clear previous timer
      if (searchTimer.value) {
        clearTimeout(searchTimer.value)
      }

      // If keyword is empty, clear search results and state
      if (!keyword || keyword.trim() === '') {
        symbolSearchResults.value = []
        hasSearched.value = false
        selectedSymbolForAdd.value = null
        return
      }

      // Debounce: execute search after 500ms
      searchTimer.value = setTimeout(() => {
        searchSymbolsInModal(keyword)
      }, 500)
    }

    // Search or add directly (combined logic)
    const handleSearchOrInput = (keyword) => {
      if (!keyword || !keyword.trim()) {
        return
      }

      if (!selectedMarketTab.value) {
        message.warning(proxy.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
        return
      }

      // If there are search results, do nothing (let user select)
      if (symbolSearchResults.value.length > 0) {
        return
      }

      // If no search results, add directly
      if (hasSearched.value && symbolSearchResults.value.length === 0) {
        handleDirectAdd()
      } else {
        // Execute search
        searchSymbolsInModal(keyword)
      }
    }

    // Search symbols (in add stock modal)
    const searchSymbolsInModal = async (keyword) => {
      if (!keyword || keyword.trim() === '') {
        symbolSearchResults.value = []
        hasSearched.value = false
        return
      }

      if (!selectedMarketTab.value) {
        message.warning(proxy.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
        return
      }

      searchingSymbols.value = true
      hasSearched.value = true
      try {
        const res = await searchSymbols({
          market: selectedMarketTab.value,
          keyword: keyword.trim(),
          limit: 20
        })
        if (res && res.code === 1 && res.data && res.data.length > 0) {
          symbolSearchResults.value = res.data
        } else {
          // No search results, no error, allow direct add
          symbolSearchResults.value = []
          // Auto-set to manual input mode
          selectedSymbolForAdd.value = {
            market: selectedMarketTab.value,
            symbol: keyword.trim().toUpperCase(),
            name: '' // Name will be fetched from backend via API
          }
        }
      } catch (error) {
        // Search failed, no error, allow direct add
        symbolSearchResults.value = []
        selectedSymbolForAdd.value = {
          market: selectedMarketTab.value,
          symbol: keyword.trim().toUpperCase(),
          name: '' // Name will be fetched from backend via API
        }
      } finally {
        searchingSymbols.value = false
      }
    }

    // Direct add (when no search results)
    const handleDirectAdd = () => {
      if (!symbolSearchKeyword.value || !symbolSearchKeyword.value.trim()) {
        message.warning(proxy.$t('dashboard.analysis.modal.addStock.pleaseEnterSymbol'))
        return
      }

      if (!selectedMarketTab.value) {
        message.warning(proxy.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
        return
      }

      // Set the selected symbol (manual input, name will be fetched from backend)
      selectedSymbolForAdd.value = {
        market: selectedMarketTab.value,
        symbol: symbolSearchKeyword.value.trim().toUpperCase(),
        name: '' // Name will be fetched from backend via API
      }
    }

    // Select symbol
    const selectSymbol = (symbol) => {
      selectedSymbolForAdd.value = {
        market: symbol.market,
        symbol: symbol.symbol,
        name: symbol.name || symbol.symbol
      }
    }

    // Load popular symbols
    const loadHotSymbols = async (market) => {
      if (!market) {
        market = selectedMarketTab.value || (marketTypes.value.length > 0 ? marketTypes.value[0].value : '')
      }

      if (!market) {
        return
      }

      loadingHotSymbols.value = true
      try {
        const res = await getHotSymbols({
          market: market,
          limit: 10
        })
        if (res && res.code === 1 && res.data) {
          hotSymbols.value = res.data
        } else {
          hotSymbols.value = []
        }
      } catch (error) {
        hotSymbols.value = []
      } finally {
        loadingHotSymbols.value = false
      }
    }

    // Add to watchlist
    const handleAddStock = async () => {
      let market = ''
      let symbol = ''

      // Check if a symbol was selected (from database or manual input)
      if (selectedSymbolForAdd.value) {
        market = selectedSymbolForAdd.value.market
        symbol = selectedSymbolForAdd.value.symbol.toUpperCase()
      } else if (symbolSearchKeyword.value && symbolSearchKeyword.value.trim()) {
        // If none selected but search box has input, use search box value
        if (!selectedMarketTab.value) {
          message.warning(proxy.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
          return
        }
        market = selectedMarketTab.value
        symbol = symbolSearchKeyword.value.trim().toUpperCase()
      } else {
        message.warning(proxy.$t('dashboard.analysis.modal.addStock.pleaseSelectOrEnterSymbol'))
        return
      }

      addingStock.value = true
      try {
        const res = await addWatchlist({
          userid: userId.value,
          market: market,
          symbol: symbol
        })
        if (res && res.code === 1) {
          message.success(proxy.$t('dashboard.analysis.message.addStockSuccess'))
          handleCloseAddStockModal()
          // Reload watchlist
          await loadWatchlist()
        } else {
          message.error(res?.msg || proxy.$t('dashboard.analysis.message.addStockFailed'))
        }
      } catch (error) {
        const errorMsg = error?.response?.data?.msg || error?.message || proxy.$t('dashboard.analysis.message.addStockFailed')
        message.error(errorMsg)
      } finally {
        addingStock.value = false
      }
    }

    // --- Data loading and chart initialization functions have been migrated to KlineChart component ---

    const addIndicator = (ind) => {
      if (isIndicatorActive(ind.id)) return
      // If the passed indicator already has params, use them; otherwise use defaultParams
      const params = ind.params || ind.defaultParams || {}
      activeIndicators.value.push({
        ...ind,
        id: ind.id, // Simple handling; use uniqueId if multiple indicators of the same type are allowed
        params: { ...params }
      })
      // KlineChart component will auto-update the chart via watch on activeIndicators
    }

    const removeIndicator = (id) => {
      // const beforeCount = activeIndicators.value.length
      activeIndicators.value = activeIndicators.value.filter(i => i.id !== id)
      // const afterCount = activeIndicators.value.length
      // KlineChart component will auto-update the chart via watch on activeIndicators
    }

    // Handle indicator toggle event from KlineChart component
    const handleIndicatorToggle = ({ action, indicator }) => {
      if (action === 'add') {
        // Need to add calculate function to indicator
        const indicatorWithCalculate = {
          ...indicator,
          calculate: getIndicatorCalculateFunction(indicator.id)
        }
        addIndicator(indicatorWithCalculate)
      } else if (action === 'remove') {
        removeIndicator(indicator.id)
      }
    }

    // Get the calculate function for a given indicator ID
    // Note: calculation functions have been migrated to KlineChart.vue; returns null, letting KlineChart.vue handle by id
    const getIndicatorCalculateFunction = (indicatorId) => {
      // KlineChart.vue's updateIndicators function handles directly by indicator.id
      // No longer needs calculation functions from Indicator.vue
      return null
    }

    const isIndicatorActive = (id) => {
      // Special handling for SMA and EMA groups
      if (id === 'sma') {
        return smaGroup.some(ind => activeIndicators.value.some(i => i.id === ind.id))
      }
      if (id === 'ema') {
        return emaGroup.some(ind => activeIndicators.value.some(i => i.id === ind.id))
      }
      return activeIndicators.value.some(i => i.id === id)
    }

    // Get custom active indicators (excluding default indicators)
    const getCustomActiveIndicators = () => {
      // Get all default indicator IDs (including smaGroup, emaGroup)
      const defaultIndicatorIds = new Set()
      smaGroup.forEach(ind => defaultIndicatorIds.add(ind.id))
      emaGroup.forEach(ind => defaultIndicatorIds.add(ind.id))

      // Filter out all default indicators
      return activeIndicators.value.filter(i => !defaultIndicatorIds.has(i.id))
    }

    // Load indicators from database
    const loadIndicators = async () => {
      if (!userId.value) return
      loadingIndicators.value = true
      try {
        const res = await request({
          url: '/api/indicator/getIndicators',
          method: 'get',
          params: {
            userid: userId.value
          }
        })

        if (res.code === 1 && res.data) {
          // My created indicators (is_buy=0 or not set)
          const customItems = res.data.filter(item => !item.is_buy || item.is_buy === 0 || item.is_buy === '0')
          // My purchased indicators (is_buy=1)
          const purchasedItems = res.data.filter(item => item.is_buy === 1 || item.is_buy === '1')

          customIndicators.value = customItems.map(item => ({
            ...item,
            type: 'python',
            source: 'custom'
          }))

          purchasedIndicators.value = purchasedItems.map(item => ({
            ...item,
            type: 'python',
            source: 'purchased'
          }))
        }
      } catch (error) {
      } finally {
        loadingIndicators.value = false
      }
    }

    // --- Python related functions have been migrated to KlineChart component ---

    // KlineChart component ref
    const klineChart = ref(null)

    // Add Python code indicator
    const addPythonIndicator = async (indicator, source) => {
      const indicatorId = `${source}-${indicator.id}`
      if (isIndicatorActive(indicatorId)) {
        removeIndicator(indicatorId)
        return
      }

      try {
        const pythonCode = indicator.code || ''
        // Check if chart component is initialized
        if (!klineChart.value) {
          message.error(proxy.$t('dashboard.indicator.error.chartNotReady'))
          return
        }

        // Check if required methods exist
        if (typeof klineChart.value.parsePythonStrategy !== 'function') {
          message.error(proxy.$t('dashboard.indicator.error.chartMethodNotReady'))
          return
        }

        if (typeof klineChart.value.executePythonStrategy !== 'function') {
          message.error(proxy.$t('dashboard.indicator.error.chartExecuteNotReady'))
          return
        }
        const parsed = klineChart.value.parsePythonStrategy(pythonCode)

        if (!parsed) {
          message.error(proxy.$t('dashboard.indicator.error.parseFailed'))
          return
        }

        // User-provided parameters (from parameter configuration modal)
        const userParams = indicator.userParams || {}

        // Create a Python indicator object
        // Save code to local variable to avoid closure issues
        const savedCode = pythonCode
        const savedUserParams = { ...userParams } // Save user parameters
        const pythonIndicator = {
          id: indicatorId, // Formatted ID (e.g., bought-1)
          name: indicator.name,
          type: 'python',
          code: savedCode,
          description: indicator.description,
          parsed: parsed, // Save parsed result
          userParams: savedUserParams, // Save user parameters
          // Save original database ID and user ID for decryption
          originalId: indicator.id, // Real ID in database
          user_id: indicator.user_id || indicator.userId, // User ID
          is_encrypted: indicator.is_encrypted || indicator.isEncrypted || 0, // Encryption flag
          calculate: (data, params) => {
            // Access executePythonStrategy function via KlineChart component ref
            // Use savedCode to ensure each indicator uses its own code (avoid closure issues)
            // Pass complete indicator info for decryption
            // Merge user parameters directly into params, so indicator code can access via params.get('name', default)
            return klineChart.value.executePythonStrategy(savedCode, data, { ...params, ...savedUserParams }, {
              id: indicator.id, // Use original database ID
              user_id: indicator.user_id || indicator.userId,
              is_encrypted: indicator.is_encrypted || indicator.isEncrypted || 0
            })
          }
        }

        const indicatorParamsFromParsed = { ...parsed.params, ...userParams }
        activeIndicators.value.push({
          ...pythonIndicator,
          params: indicatorParamsFromParsed
        })
        // KlineChart component will auto-update the chart via watch on activeIndicators
      } catch (error) {
        message.error(proxy.$t('dashboard.indicator.error.addIndicatorFailed') + ': ' + (error.message || 'Unknown error'))
      }
    }

    // Toggle indicator on/off
    const toggleIndicator = async (indicator, source) => {
      const indicatorId = `${source}-${indicator.id}`
      if (isIndicatorActive(indicatorId)) {
        removeIndicator(indicatorId)
      } else {
        // Check if indicator has parameter declarations
        try {
          loadingParams.value = true
          const res = await proxy.$http.get('/api/indicator/getIndicatorParams', {
            params: { indicator_id: indicator.id }
          })
          if (res && res.code === 1 && Array.isArray(res.data) && res.data.length > 0) {
            // Has parameters, show configuration modal
            indicatorParams.value = res.data
            // Get indicator unique key (for saving parameter values)
            const indicatorKey = `${source}-${indicator.id}`
            // First check if there are saved parameter values
            const savedParams = savedIndicatorParams.value[indicatorKey]
            // Clear first, then set one by one to ensure reactivity works correctly
            const newParamValues = {}
            res.data.forEach(p => {
              // If saved value exists, use it; otherwise use default
              // Need to handle type conversion
              let value = savedParams && savedParams[p.name] !== undefined
                ? savedParams[p.name]
                : p.default

              // Type conversion based on parameter type
              if (p.type === 'int') {
                value = parseInt(value) || 0
              } else if (p.type === 'float') {
                value = parseFloat(value) || 0.0
              } else if (p.type === 'bool') {
                value = value === true || value === 'true' || value === 1 || value === '1'
              } else {
                value = value || ''
              }

              newParamValues[p.name] = value
            })
            // Set all values at once to ensure reactive updates
            indicatorParamValues.value = newParamValues
            pendingIndicator.value = indicator
            pendingSource.value = source
            showParamsModal.value = true
          } else {
            // No parameters, run directly
            addPythonIndicator(indicator, source)
          }
        } catch (err) {
          console.warn('Failed to load indicator params:', err)
          // Run directly on error
          addPythonIndicator(indicator, source)
        } finally {
          loadingParams.value = false
        }
      }
    }

    // Confirm parameter configuration and run indicator
    const confirmIndicatorParams = () => {
      if (pendingIndicator.value) {
        // Save parameter values (for next time opening)
        const indicatorKey = `${pendingSource.value}-${pendingIndicator.value.id}`
        savedIndicatorParams.value[indicatorKey] = { ...indicatorParamValues.value }

        // Pass parameters to indicator
        const indicatorWithParams = {
          ...pendingIndicator.value,
          userParams: { ...indicatorParamValues.value }
        }
        addPythonIndicator(indicatorWithParams, pendingSource.value)
      }
      showParamsModal.value = false
      pendingIndicator.value = null
      pendingSource.value = ''
    }

    // Cancel parameter configuration
    const cancelIndicatorParams = () => {
      // Save parameter values (before closing)
      saveCurrentParams()
      showParamsModal.value = false
      // Delay clearing to ensure afterClose can access the data
      setTimeout(() => {
        pendingIndicator.value = null
        pendingSource.value = ''
      }, 100)
    }

    // Save current parameter values
    const saveCurrentParams = () => {
      if (pendingIndicator.value && pendingSource.value) {
        const indicatorKey = `${pendingSource.value}-${pendingIndicator.value.id}`
        // Deep copy parameter values to ensure saved values are current
        savedIndicatorParams.value[indicatorKey] = JSON.parse(JSON.stringify(indicatorParamValues.value))
      }
    }

    // Handler after modal closes
    const handleParamsModalAfterClose = () => {
      // Ensure parameter values are saved
      saveCurrentParams()
    }

    // Run indicator code (from editor)
    const handleRunIndicator = (data) => {
      const { code, name } = data
      if (!code || !code.trim()) {
        message.warning(proxy.$t('dashboard.indicator.warning.enterCode'))
        return
      }

      // Create a temporary indicator object for running
      try {
        // Check if chart component is initialized
        if (!klineChart.value) {
          message.error(proxy.$t('dashboard.indicator.error.chartNotReady'))
          return
        }

        // Check if required methods exist
        if (typeof klineChart.value.parsePythonStrategy !== 'function') {
          message.error(proxy.$t('dashboard.indicator.error.chartMethodNotReady'))
          return
        }

        if (typeof klineChart.value.executePythonStrategy !== 'function') {
          message.error(proxy.$t('dashboard.indicator.error.chartExecuteNotReady'))
          return
        }
        const parsed = klineChart.value.parsePythonStrategy(code)
        if (!parsed) {
          message.error(proxy.$t('dashboard.indicator.error.parseFailedCheck'))
          return
        }

        // Create Python indicator object
        const pythonIndicator = {
          id: 'temp-editor-indicator',
          name: name || 'Temporary indicator',
          type: 'python',
          code: code,
          description: '',
          parsed: parsed,
          calculate: (data, params) => {
            // Access executePythonStrategy function via KlineChart component ref
            // Use indicator.code to ensure each indicator uses its own code (avoid closure issues)
            // Note: using indicatorCode here because this is a temporary indicator, needing code from outer scope
            const indicatorCode = code
            return klineChart.value.executePythonStrategy(indicatorCode, data, params)
          }
        }

        // If temporary indicator already exists, remove it first
        const existingIndex = activeIndicators.value.findIndex(i => i.id === 'temp-editor-indicator')
        if (existingIndex >= 0) {
          activeIndicators.value.splice(existingIndex, 1)
        }

        // Add to active indicators list
        activeIndicators.value.push({
          ...pythonIndicator,
          params: { ...parsed.params }
        })

        // KlineChart component will auto-update the chart via watch on activeIndicators
        message.success(proxy.$t('dashboard.indicator.success.runIndicator'))
      } catch (error) {
        message.error(proxy.$t('dashboard.indicator.error.runIndicatorFailed') + ': ' + (error.message || 'Unknown error'))
      }
    }

    // Create indicator
    const handleCreateIndicator = () => {
      editingIndicator.value = null
      showIndicatorEditor.value = true
    }

    // Edit indicator
    const handleEditIndicator = (indicator) => {
      editingIndicator.value = indicator
      showIndicatorEditor.value = true
    }

    // Toggle collapse state of "my created indicators" section
    const toggleCustomSection = () => {
      customSectionCollapsed.value = !customSectionCollapsed.value
    }

    // Delete indicator
    const handleDeleteIndicator = (indicator) => {
      Modal.confirm({
        title: proxy.$t('dashboard.indicator.delete.confirmTitle'),
        content: proxy.$t('dashboard.indicator.delete.confirmContent', { name: indicator.name }),
        okText: proxy.$t('dashboard.indicator.delete.confirmOk'),
        okType: 'danger',
        cancelText: proxy.$t('dashboard.indicator.delete.confirmCancel'),
        onOk: async () => {
          try {
            const res = await request({
              url: '/api/indicator/deleteIndicator',
              method: 'post',
              data: {
                id: indicator.id,
                userid: userId.value
              }
            })

            if (res.code === 1) {
              message.success(proxy.$t('dashboard.indicator.delete.success'))
              // If the indicator is currently in use, remove it first
              const indicatorId = 'custom-' + indicator.id
              if (isIndicatorActive(indicatorId)) {
                removeIndicator(indicatorId)
              }
              // Reload indicator list
              await loadIndicators()
            } else {
              message.error(res.msg || proxy.$t('dashboard.indicator.delete.failed'))
            }
          } catch (error) {
            message.error(proxy.$t('dashboard.indicator.delete.failed') + ': ' + (error.message || 'Unknown error'))
          }
        }
      })
    }

    // Open backtest modal (strategy = indicator signals + backtest parameter configuration)
    const handleOpenBacktest = (indicator) => {
      backtestIndicator.value = { ...indicator }
      showBacktestModal.value = true
    }

    const handleOpenBacktestHistory = (indicator) => {
      backtestHistoryIndicator.value = { ...indicator }
      showBacktestHistoryDrawer.value = true
    }

    const handleViewBacktestRun = (run) => {
      selectedBacktestRun.value = run
      showBacktestRunViewer.value = true
    }

    // Publish indicator to community
    const handlePublishIndicator = (indicator) => {
      publishIndicator.value = { ...indicator }
      // Set form initial values
      publishPricingType.value = indicator.pricing_type || 'free'
      publishPrice.value = indicator.price || 10
      publishDescription.value = indicator.description || ''
      publishVipFree.value = !!indicator.vip_free
      showPublishModal.value = true
    }

    // Confirm publish
    const handleConfirmPublish = async () => {
      if (!userId.value) {
        message.error(proxy.$t('dashboard.indicator.error.pleaseLogin'))
        return
      }

      publishing.value = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: userId.value,
            id: publishIndicator.value.id,
            code: publishIndicator.value.code,
            name: publishIndicator.value.name,
            description: publishDescription.value,
            publishToCommunity: true,
            pricingType: publishPricingType.value,
            price: publishPricingType.value === 'paid' ? publishPrice.value : 0,
            vipFree: publishPricingType.value === 'paid' ? publishVipFree.value : false
          }
        })

        if (res.code === 1) {
          message.success(proxy.$t('dashboard.indicator.publish.success'))
          showPublishModal.value = false
          publishIndicator.value = null
          await loadIndicators()
        } else {
          message.error(res.msg || proxy.$t('dashboard.indicator.publish.failed'))
        }
      } catch (error) {
        message.error(proxy.$t('dashboard.indicator.publish.failed') + ': ' + (error.message || ''))
      } finally {
        publishing.value = false
      }
    }

    // Unpublish
    const handleUnpublish = async () => {
      if (!userId.value || !publishIndicator.value) return

      unpublishing.value = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: userId.value,
            id: publishIndicator.value.id,
            code: publishIndicator.value.code,
            name: publishIndicator.value.name,
            description: publishIndicator.value.description,
            publishToCommunity: false,
            pricingType: 'free',
            price: 0,
            vipFree: false
          }
        })

        if (res.code === 1) {
          message.success(proxy.$t('dashboard.indicator.publish.unpublishSuccess'))
          showPublishModal.value = false
          publishIndicator.value = null
          await loadIndicators()
        } else {
          message.error(res.msg || proxy.$t('dashboard.indicator.publish.unpublishFailed'))
        }
      } catch (error) {
        message.error(proxy.$t('dashboard.indicator.publish.unpublishFailed'))
      } finally {
        unpublishing.value = false
      }
    }

    // Save indicator to database
    const handleSaveIndicator = async (data) => {
      if (!userId.value) {
        message.error(proxy.$t('dashboard.indicator.error.pleaseLogin'))
        return
      }

      // Get editor component via ref, set saving state
      const editorRef = proxy.$refs.indicatorEditor
      if (editorRef) {
        editorRef.saving = true
      }

      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: userId.value,
            id: data.id || 0,
            code: data.code
          }
        })

        if (res.code === 1) {
          message.success(proxy.$t('dashboard.indicator.save.success'))
          // Close modal
          showIndicatorEditor.value = false
          editingIndicator.value = null
          // Reload indicator list
          await loadIndicators()
        } else {
          message.error(res.msg || proxy.$t('dashboard.indicator.save.failed'))
        }
      } catch (error) {
        message.error(proxy.$t('dashboard.indicator.save.failed') + ': ' + (error.message || 'Unknown error'))
      } finally {
        if (editorRef) {
          editorRef.saving = false
        }
      }
    }

    // Get indicator status text
    const getIndicatorStatus = (indicator) => {
      const endTime = indicator.end_time
      if (endTime === 1 || endTime === '1') {
        return proxy.$t('dashboard.indicator.status.normalPermanent')
      }
      if (!endTime || endTime === 0) {
        return proxy.$t('dashboard.indicator.status.normal')
      }
      const currentTime = Math.floor(Date.now() / 1000)
      if (endTime < currentTime) {
        return proxy.$t('dashboard.indicator.status.expired')
      }
      return proxy.$t('dashboard.indicator.status.normal')
    }

    // Get indicator status icon
    const getIndicatorStatusIcon = (indicator) => {
      const endTime = indicator.end_time
      if (endTime === 1 || endTime === '1') {
        return 'check-circle'
      }
      if (!endTime || endTime === 0) {
        return 'check-circle'
      }
      const currentTime = Math.floor(Date.now() / 1000)
      if (endTime < currentTime) {
        return 'close-circle'
      }
      return 'check-circle'
    }

    // Get indicator status CSS class
    const getIndicatorStatusClass = (indicator) => {
      const endTime = indicator.end_time
      if (endTime === 1 || endTime === '1') {
        return 'status-normal'
      }
      if (!endTime || endTime === 0) {
        return 'status-normal'
      }
      const currentTime = Math.floor(Date.now() / 1000)
      if (endTime < currentTime) {
        return 'status-expired'
      }
      return 'status-normal'
    }

    // Get expiry time text
    const getExpiryTimeText = (indicator) => {
      const endTime = indicator.end_time
      if (endTime === 1 || endTime === '1') {
        return proxy.$t('dashboard.indicator.expiry.permanent')
      }
      if (!endTime || endTime === 0) {
        return proxy.$t('dashboard.indicator.expiry.noExpiry')
      }
      const currentTime = Math.floor(Date.now() / 1000)
      const date = new Date(endTime * 1000).toLocaleString('en-US')
      if (endTime < currentTime) {
        return proxy.$t('dashboard.indicator.expiry.expired', { date })
      }
      return proxy.$t('dashboard.indicator.expiry.expiresOn', { date })
    }

    // Get market name (i18n)
    const getMarketName = (market) => {
      const marketMap = {
        'USStock': 'dashboard.indicator.market.USStock',
        'Crypto': 'dashboard.indicator.market.Crypto',
        'Forex': 'dashboard.indicator.market.Forex',
        'Futures': 'dashboard.indicator.market.Futures',
        'IndianStock': 'dashboard.indicator.market.IndianStock'
      }
      const key = marketMap[market]
      return key && proxy?.$t ? proxy.$t(key) : market
    }

    // Get market color
    const getMarketColor = (market) => {
      const colors = {
        'USStock': 'green',
        'Crypto': 'purple',
        'Forex': 'gold',
        'Futures': 'cyan',
        'IndianStock': 'volcano'
      }
      return colors[market] || 'default'
    }

    // --- Realtime update functions have been migrated to KlineChart component ---

    // Toggle realtime update state
    const toggleRealtime = () => {
      realtimeEnabled.value = !realtimeEnabled.value
      localStorage.setItem('realtimeEnabled', realtimeEnabled.value.toString())
      // KlineChart component will auto-start or stop realtime updates via watch on realtimeEnabled
    }

    // Detect if on mobile device
    const checkMobile = () => {
      isMobile.value = window.innerWidth <= 768
    }

    onMounted(() => {
      // Load realtime update settings from localStorage
      const savedRealtime = localStorage.getItem('realtimeEnabled')
      if (savedRealtime !== null) {
        realtimeEnabled.value = savedRealtime === 'true'
      }

      // Detect device type
      checkMobile()
      window.addEventListener('resize', checkMobile)

      // Load market types and popular symbols
      loadMarketTypes()

      // Load user info (will try from store/API; in local single-user mode userId defaults to 1)
      loadUserInfo()

      // Local single-user mode: load watchlist directly, preventing empty symbol selector when not logged in
      loadWatchlist()

      // Load indicator list (only “my created indicators”)
      loadIndicators()

      // KlineChart component will auto-handle realtime updates and chart initialization
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', checkMobile)
      // Clean up search timer
      if (searchTimer.value) {
        clearTimeout(searchTimer.value)
      }
      // KlineChart component will auto-clean up resources
    })

    // Watch modal open, initialize data
    watch(showAddStockModal, (newVal) => {
      if (newVal) {
        // Initialize selected market type
        if (marketTypes.value.length > 0 && !selectedMarketTab.value) {
          selectedMarketTab.value = marketTypes.value[0].value
        }
        // Load popular symbols
        if (selectedMarketTab.value) {
          loadHotSymbols(selectedMarketTab.value)
        }
      } else {
        // Clean up data when closing
        selectedSymbolForAdd.value = null
        symbolSearchKeyword.value = ''
        symbolSearchResults.value = []
        hasSearched.value = false
        if (searchTimer.value) {
          clearTimeout(searchTimer.value)
          searchTimer.value = null
        }
      }
    })

    // Watch parameter value changes, save in realtime
    watch(
      () => indicatorParamValues.value,
      (newVal) => {
        // Only save when modal is open and there is a pendingIndicator
        if (showParamsModal.value && pendingIndicator.value && pendingSource.value) {
          const indicatorKey = `${pendingSource.value}-${pendingIndicator.value.id}`
          // Deep copy to avoid reference issues
          savedIndicatorParams.value[indicatorKey] = JSON.parse(JSON.stringify(newVal))
        }
      },
      { deep: true, immediate: false }
    )

    // Watch parameter configuration modal close
    watch(showParamsModal, (newVal) => {
      if (!newVal) {
        // When modal closes, ensure parameter values are saved
        saveCurrentParams()
      }
    })

    return {
      userId,
      klineChart,
      searchSymbol,
      symbolSuggestions,
watchlist,
symbolSearchValue,
symbolSearchOpen,
      currentSymbol,
currentMarket,
      currentPrice,
      priceChange,
      priceChangeClass,
      timeframe,
loadingWatchlist,
      activeIndicators,
      trendIndicators,
      oscillatorIndicators,
      customIndicators,
      purchasedIndicators,
      loadingIndicators,
      realtimeEnabled,
toggleRealtime,
      handleSymbolSearch,
      handleSymbolSelect,
handleDropdownVisibleChange,
      filterSymbolOption,
getMarketName,
getMarketColor,
      setTimeframe,
      addIndicator,
      removeIndicator,
      isIndicatorActive,
      loadIndicators,
      addPythonIndicator,
      toggleIndicator,
      getIndicatorStatus,
      getIndicatorStatusIcon,
      getIndicatorStatusClass,
      getExpiryTimeText,
      formatParams,
      loadWatchlist,
      getCustomActiveIndicators,
      showIndicatorEditor,
      editingIndicator,
      handleCreateIndicator,
      handleRunIndicator,
      handleSaveIndicator,
      handleEditIndicator,
      handleDeleteIndicator,
      toggleCustomSection,
      customSectionCollapsed,
      purchasedSectionCollapsed,
      handlePriceChange,
      handleChartRetry,
      handleIndicatorToggle,
      // Indicator parameter configuration related
      showParamsModal,
      pendingIndicator,
      indicatorParams,
      indicatorParamValues,
      loadingParams,
      confirmIndicatorParams,
      cancelIndicatorParams,
      handleParamsModalAfterClose,
      // Backtest related
      showBacktestModal,
      backtestIndicator,
      handleOpenBacktest,
      // Backtest history related
      showBacktestHistoryDrawer,
      backtestHistoryIndicator,
      handleOpenBacktestHistory,
      showBacktestRunViewer,
      selectedBacktestRun,
      handleViewBacktestRun,
      // Publish to community related
      showPublishModal,
      publishIndicator,
      publishing,
      unpublishing,
      publishPricingType,
      publishPrice,
      publishDescription,
      publishVipFree,
      publishRules,
      handlePublishIndicator,
      handleConfirmPublish,
      handleUnpublish,
      // Expose selected values for backtest modal
      selectedSymbol: currentSymbol,
      selectedMarket: currentMarket,
      selectedTimeframe: timeframe,
      // Chart view toggle
      chartViewMode,
      tradingViewSymbol,
      tradingViewEmbedUrl,
      // Mobile related
      isMobile,
      // Add stock modal related
      showAddStockModal,
      addingStock,
      selectedMarketTab,
      symbolSearchKeyword,
      symbolSearchResults,
      searchingSymbols,
      hotSymbols,
      loadingHotSymbols,
      selectedSymbolForAdd,
      marketTypes,
      hasSearched,
      handleCloseAddStockModal,
      handleMarketTabChange,
      handleSymbolSearchInput,
      handleSearchOrInput,
      searchSymbolsInModal,
      selectSymbol,
      loadHotSymbols,
      handleAddStock,
      handleDirectAdd,
      loadMarketTypes
    }
  }
}
</script>

<style lang="less" scoped>
/* Main container: light theme background */
.chart-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  // height: 100vh; /* Use 100vh so chart-content's 70vh takes effect */
  min-width: 100%;
  // max-width: 100%;
  background: #f0f2f5;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  box-sizing: border-box;
}

/* Top Header */
.chart-header {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  box-sizing: border-box;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

/* Search box styling */
.symbol-select {
  width: 220px;

  :deep(.ant-select-selection) {
    background-color: #fff;
    border: 1px solid #e8e8e8;
    color: #333;
    border-radius: 4px;
    box-shadow: none;

    &:hover {
      border-color: #1890ff;
    }
  }

  :deep(.ant-select-focused .ant-select-selection) {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }

  :deep(.ant-select-arrow) {
    color: #999;
  }

  :deep(.ant-select-selection__placeholder) {
    color: #999;
  }
}

/* Timeframe buttons */
.timeframe-group {
  display: flex;
  background: #f0f2f5;
  border-radius: 4px;
  padding: 2px;
}

.timeframe-item {
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px;

  &:hover {
    color: #1890ff;
    background: #fff;
  }

  &.active {
    color: #1890ff;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
}

/* Current symbol info */
.current-symbol {
  display: flex;
  align-items: center;
  gap: 24px;
}

.symbol-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

  .symbol-label {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.market-tag {
  font-size: 10px;
  color: #666;
  background: #f0f2f5;
  padding: 1px 4px;
  border-radius: 2px;
  margin-top: 2px;
}

.price-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  &.color-up { color: #0ecb81; }
  &.color-down { color: #f6465d; }
  }

  .symbol-price {
  font-size: 18px;
    font-weight: 600;
  font-family: 'Roboto Mono', monospace;
  line-height: 1.2;
}

.symbol-change {
  font-size: 12px;
}

/* Mobile: show symbol and price info above K-line chart */
.mobile-symbol-price {
  display: none; /* Hidden by default, only shown on mobile */
}

/* Theme toggle button */
/* Theme toggle button - in panel-header */
.panel-header .theme-switcher {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.panel-header .realtime-toggle-btn,
.panel-header .theme-toggle-btn {
  color: #666;
  border: none;
  padding: 4px 8px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  min-width: 32px;
  height: 32px;

  &:hover {
    color: #1890ff;
    background: #f0f2f5;
  }

  &.active {
    color: #1890ff;
    background: #e6f7ff;
  }

  .anticon {
    font-size: 16px;
  }
}

/* Main content area */
.chart-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.chart-main-row {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 80vh !important; /* K-line chart takes 70% of screen height */
  min-height: 500px !important; /* Minimum height guarantee */
  max-height: 80vh !important; /* Limit maximum height */
  flex-shrink: 0; /* Prevent being compressed */
  flex-wrap: wrap;
}

/* Chart area wrapper - takes same flex space as kline-chart */
.chart-area-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
/* KlineChart fills full width/height of wrapper (overrides KlineChart's own 70% !important) */
.chart-area-wrapper /deep/ .chart-left {
  width: 100% !important;
  flex: 1 1 auto !important;
  min-height: 0;
}

/* Chart view toggle tabs */
.chart-view-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: #f0f0f0;
  border-radius: 6px;
  flex-shrink: 0;
  margin: 4px 8px;
}
.chart-view-tab {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  color: #888;
  transition: all 0.15s;
  user-select: none;
  white-space: nowrap;
  &:hover {
    color: #555;
  }
  &.active {
    background: #13C2C2;
    color: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  i {
    margin-right: 3px;
  }
}

/* TradingView widget container */
.tradingview-container {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
}
.tradingview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
.tradingview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #999;
  font-size: 14px;
  background: #fafafa;
}

/* Dark theme overrides for chart view tabs */
.theme-dark {
  .chart-view-tabs {
    background: #252535;
  }
  .chart-view-tab {
    color: #aaa;
    &:hover {
      color: #ddd;
    }
    &.active {
      background: #13C2C2;
      color: #fff;
    }
  }
  .tradingview-empty {
    background: #141422;
    color: #666;
  }
}

/* Chart related styles have been migrated to KlineChart component */

/* Right-side indicator sidebar */
.chart-right {
  width: 30% !important;
  flex: 0 0 30% !important;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e8e8e8;
}

.indicators-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.panel-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #e8e8e8;
  font-weight: 600;
  color: #333;
  background: #fff;

  .mobile-header-create-btn {
    margin-right: 0;
  }
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.indicator-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-bottom: 1px solid #e8e8e8;

  &:last-child {
    border-bottom: none;
  }

  &.section-empty {
    min-height: 200px;
  }
}

.section-label {
  flex-shrink: 0;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;

  .section-label-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;

    .collapse-icon {
      font-size: 12px;
      color: #999;
      transition: transform 0.2s;
    }

    span {
      font-weight: 500;
    }
  }

  .buy-indicator-btn {
    padding: 0;
    height: auto;
    margin-left: 8px;
  }
}

.create-indicator-btn {
  margin-left: auto;
  margin-right: 0px;
}

/* Hide desktop create button on mobile */
@media (max-width: 768px) {
  .create-indicator-btn {
    display: none !important;
  }
}

.section-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  min-height: 0;
}

/* Indicator card */
.indicator-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e8e8e8;

  &:hover {
    background: #f0f2f5;
    border-color: #1890ff;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &.active {
    background: #e6f7ff;
    border-color: #1890ff;

    .card-name { color: #1890ff; }
  }

  &.indicator-active {
    border-color: #52c41a;
    border-width: 2px;
    background: #f6ffed;

    &:hover {
      border-color: #73d13d;
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.2);
    }

    .card-name {
      color: #52c41a;
    }
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      transform: none;
      background: #fff;
      border-color: #e8e8e8;
      box-shadow: none;
    }
  }
}

.card-content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.card-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
  flex: 1;
  margin-right: 8px;
}

.card-params {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.card-desc {
  font-size: 11px;
  color: #999;
  margin-top: 0;
  display: -webkit-box;
  width: 100%;
  box-sizing: border-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  line-height: 1.4;
  min-height: 1.4em;
  max-height: 2.8em;
}

.card-action {
  color: #999;
  font-size: 12px;
  &:hover { color: #1890ff; }
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.action-icon {
  &.edit-icon {
    color: #1890ff;
    &:hover {
      color: #40a9ff;
    }
  }
  &.delete-icon {
    color: #ff4d4f;
    &:hover {
      color: #ff7875;
    }
  }
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  color: #999;

  &:hover {
    color: #1890ff;
  }

  &.toggle-icon {
    &.active {
      color: #52c41a;
    }
  }

  &.backtest-icon {
    color: #722ed1;
    &:hover {
      color: #9254de;
    }
  }
  &.backtest-history-icon {
    color: #13c2c2;
    &:hover {
      color: #08979c;
    }
  }

  &.publish-icon {
    color: #1890ff;
    &:hover {
      color: #40a9ff;
    }
    &.published {
      color: #52c41a;
      &:hover {
        color: #73d13d;
      }
    }
  }

  &.status-icon {
    &.status-normal {
      color: #52c41a;
    }

    &.status-expired {
      color: #ff4d4f;
    }
  }

  &.expiry-icon {
    color: #1890ff;
  }
}

.empty-indicators {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
  font-size: 13px;
  gap: 8px;
  flex-direction: column;
}

.loading-indicators {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}

/* Custom scrollbar - hide scrollbar but keep scroll functionality */
.custom-scrollbar {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

.custom-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome Safari */
  width: 0;
  height: 0;
}

/* Override Ant Design dropdown styles */
:global(.dark-dropdown) {
  background-color: #fff;
  border: 1px solid #e8e8e8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
:global(.dark-dropdown .ant-select-dropdown-menu-item) {
  color: #333;
}
:global(.dark-dropdown .ant-select-dropdown-menu-item:hover) {
  background-color: #f0f2f5;
}
:global(.dark-dropdown .ant-select-dropdown-menu-item-active) {
  background-color: #e6f7ff;
  color: #1890ff;
}
:global(.dark-dropdown .ant-empty-description) {
  color: #999;
}

.symbol-option {
  display: flex;
  align-items: center;
  .symbol-name {
    font-weight: 600;
    color: #8f8d8d;
    margin-right: 8px;
  }
  .symbol-name-extra {
    font-size: 12px;
    color: #999;
    margin-left: 4px;
  }
}

.empty-watchlist-hint {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 12px;
}

/* Responsive styles - mobile */
@media (max-width: 768px) {
  .chart-container {
    padding: 0;
    width: calc(100% + 44px) !important;
    margin: -22px;
  }

  .chart-header {
    padding: 12px;
    gap: 12px;
    height: auto;
    flex-direction: column;

    .header-top {
      flex-direction: column;
      height: auto;
      padding: 0;
      gap: 12px;
    }

    .header-left {
      width: 100%;
      flex-direction: column;
      gap: 12px;
    }

    .search-section {
      width: 100%;

      .symbol-select {
        width: 100% !important;
      }
    }

    .timeframe-group {
      width: 100%;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 4px;

      .timeframe-item {
        flex: 1;
        min-width: calc(14.28% - 4px); /* 7 buttons, each about 14.28% */
        text-align: center;
        padding: 6px 8px;
        font-size: 12px;
      }
    }

    .current-symbol {
      display: none; /* Hide header symbol info on mobile, use the one above K-line chart instead */
    }
  }

  .chart-content {
    flex-direction: column !important;
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
    overflow-y: auto;
  }

  .chart-main-row {
    flex-direction: column !important;
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
  }

  .mobile-symbol-price {
    order: 0 !important;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #fff;
    // border-bottom: 1px solid #e8e8e8;
    width: 100%;

    .mobile-price-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-direction: row; /* Ensure displayed in one row */

      &.color-up { color: #0ecb81; }
      &.color-down { color: #f6465d; }

      .mobile-symbol-price {
        font-size: 18px;
        font-weight: 600;
        font-family: 'Roboto Mono', monospace;
      }

      .mobile-symbol-change {
        font-size: 14px;
        font-weight: 500;
      }
    }
  }

  /* Chart area wrapper on mobile */
  .chart-area-wrapper {
    order: 1 !important;
    width: 100% !important;
    flex: 0 0 auto !important;
    height: auto !important;
    min-height: 0 !important;
  }

  .chart-view-tabs {
    margin: 8px 12px !important;
  }

  .tradingview-container {
    height: 350px !important;
    min-height: 350px !important;
  }

  /* K-line chart on top */
  kline-chart {
    order: 1 !important;
    width: 100% !important;
    flex: 0 0 auto !important;
    display: block !important;
    margin-bottom: 0 !important;
  }

  kline-chart :deep(.chart-left) {
    width: 100% !important;
    height: 350px !important;
    min-height: 350px !important;
    max-height: 350px !important;
    border-right: none !important;
    border-bottom: 1px solid #e8e8e8 !important;
  }

  /* Indicator list at bottom */
  .chart-right {
    order: 2 !important;
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
    flex: 0 0 auto !important;
    height: auto !important;
    max-height: calc(100vh - 350px - 120px) !important; /* Subtract K-line chart height and header height */
    border-left: none !important;
    border-top: none !important;
    margin-top: 0 !important;
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;

    .indicators-panel {
      height: auto !important;
      min-height: 600px !important; /* Increase minimum height */
      max-height: calc(100vh - 350px - 60px) !important; /* Increase height, subtract K-line chart height and header height */
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .panel-header {
        position: sticky;
        top: 0;
        background: #fff;
        z-index: 10;
        border-bottom: 1px solid #e8e8e8;
        padding: 12px;
        font-size: 14px;
        flex-shrink: 0;

        .mobile-header-create-btn {
          margin-right: 0;
          font-size: 12px;
          height: 28px;
          padding: 0 12px;
        }
      }

      .panel-body {
        padding: 0;
        flex: 1;
        overflow: visible;
        display: flex;
        flex-direction: column;
        min-height: 400px !important;
      }

      .mobile-indicator-tabs {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden; /* Prevent entire tabs from scrolling */
        min-height: 0;
        height: 100%;

        :deep(.ant-tabs-bar) {
          margin-bottom: 0;
          flex-shrink: 0;
          border-bottom: 1px solid #e8e8e8;
        }

        :deep(.ant-tabs-tab) {
          color: #666;
          font-size: 14px;
        }

        :deep(.ant-tabs-tab-active) {
          color: #1890ff;
        }

        :deep(.ant-tabs-ink-bar) {
          background-color: #1890ff;
        }

        :deep(.ant-tabs-content) {
          flex: 1;
          overflow: auto; /* Prevent content area scrolling */
          min-height: 0;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        :deep(.ant-tabs-tabpane) {
          height: 100%;
          overflow: hidden; /* Prevent tabpane scrolling */
          display: none;
          flex-direction: column;
          min-height: 0;
        }

        :deep(.ant-tabs-tabpane-active) {
          display: flex !important;
          flex-direction: column;
          min-height: 0;
          height: 100%;
          overflow: hidden; /* Prevent active tabpane scrolling */
        }

        :deep(.ant-tabs-content-holder) {
          flex: 1;
          overflow: hidden; /* Prevent content-holder scrolling */
          min-height: 0;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .mobile-tab-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden; /* Don't scroll here, let section-content scroll */
          min-height: 0;
          height: 100%;
          width: 100%;
        }

        .section-content {
          flex: 1;
          overflow-y: auto !important; /* Only scroll here */
          overflow-x: hidden;
          padding: 12px;
          min-height: 0; /* Use flex: 1 to take remaining space */
          height: 100%; /* Use 100% height to let flex work */
          -webkit-overflow-scrolling: touch;
          position: relative;
        }

        .mobile-create-btn-wrapper {
          display: none !important; /* No longer needed on mobile, button moved to header */
        }

        .mobile-create-btn {
          display: none !important; /* No longer needed on mobile, moved to header */
        }
      }

      .indicator-section {
        .section-label {
          padding: 10px 12px;
          font-size: 13px;
        }
      }

      .section-content {
        padding: 10px 12px;
      }

      .indicator-card {
        padding: 10px;

        .card-name {
          font-size: 13px;
        }

        .card-params,
        .card-desc {
          font-size: 11px;
        }
      }
    }
  }
}

/* ========== Dark theme styles ========== */
/* Auto-apply dark styles based on framework theme */
/* Styles applied when theme is dark - via component class or global class */
.chart-container.theme-dark,
:global(body.dark) .chart-container,
:global(body.realdark) .chart-container,
:global(.ant-layout.dark) .chart-container,
:global(.ant-layout.realdark) .chart-container,
:global(.ant-pro-layout.dark) .chart-container,
:global(.ant-pro-layout.realdark) .chart-container {
  background: #131722;
  color: #d1d4dc;

  .chart-header {
    background: #1e222d;
    border-bottom-color: #2a2e39;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

    .header-top {
      .current-symbol {
        .symbol-label {
          color: #d1d4dc;
        }

        .market-tag {
          color: #868993;
          background: #2a2e39;
        }

        .price-info {
          &.color-up {
            color: #0ecb81;
          }

          &.color-down {
            color: #f6465d;
          }
        }
      }
    }
  }

  .symbol-select {
    :deep(.ant-select-selection) {
      background-color: #1e222d;
      border-color: #2a2e39;
      color: #d1d4dc;

      &:hover {
        border-color: #1890ff;
      }
    }

    :deep(.ant-select-focused .ant-select-selection) {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.3);
    }

    :deep(.ant-select-arrow) {
      color: #868993;
    }

    :deep(.ant-select-selection__placeholder) {
      color: #868993;
    }
  }

  .timeframe-group {
    background: #2a2e39;

    .timeframe-item {
      color: #868993;

      &:hover {
        color: #1890ff;
        background: #1e222d;
      }

      &.active {
        color: #1890ff;
        background: #1e222d;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }
    }
  }

  .mobile-symbol-price {
    background: #1e222d;
    border-bottom-color: #2a2e39;

    .mobile-symbol-label {
      margin-left: 5px;
      color: #d1d4dc;
    }

    .mobile-market-tag {
      color: #868993;
      background: #21283c;
    }

    .mobile-price-info {
      &.color-up {
        color: #0ecb81;
      }

      &.color-down {
        color: #f6465d;
      }
    }
  }

  .chart-right {
    background: #1e222d;
    border-left-color: #2a2e39;

    .indicators-panel {
      background: #1e222d;

      .panel-header {
        background: #1e222d;
        border-bottom-color: #2a2e39;
        color: #d1d4dc;

        .realtime-toggle-btn {
          color: #868993;

          &:hover {
            color: #1890ff;
            background: #2a2e39;
          }

          &.active {
            color: #1890ff;
            background: #2a2e39;
          }
        }
      }

      .panel-body {
        background: #1e222d;
      }

      .indicator-section {
        border-bottom-color: #2a2e39;
      }

      .section-label {
        color: #868993;
        background: #2a2e39;
        border-bottom-color: #2a2e39;

        .section-label-left {
          .collapse-icon {
            color: #868993;
          }

          span {
            color: #d1d4dc;
          }
        }

        .buy-indicator-btn {
          color: #1890ff;

          &:hover {
            color: #40a9ff;
          }
        }
      }

      .indicator-card {
        background: #1e222d;
        border-color: #2a2e39;

        &:hover {
          background: #2a2e39;
          border-color: #1890ff;
        }

        &.active {
          background: #2a2e39;
          border-color: #1890ff;

          .card-name {
            color: #1890ff;
          }
        }

        &.indicator-active {
          border-color: #52c41a;
          background: #1e3a1e;

          &:hover {
            border-color: #73d13d;
            box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
          }

          .card-name {
            color: #52c41a;
          }
        }

        .card-name {
          color: #d1d4dc;
        }

        .card-params,
        .card-desc {
          color: #868993;
        }

        .action-icon {
          color: #868993;

          &:hover {
            color: #1890ff;
          }

          &.edit-icon {
            color: #1890ff;

            &:hover {
              color: #40a9ff;
            }
          }

          &.delete-icon {
            color: #ff4d4f;

            &:hover {
              color: #ff7875;
            }
          }

          &.backtest-icon {
            color: #b37feb;

            &:hover {
              color: #d3adf7;
            }
          }
          &.backtest-history-icon {
            color: #5cdbd3;
            &:hover {
              color: #87e8de;
            }
          }

          &.publish-icon {
            color: #1890ff;
            &:hover {
              color: #40a9ff;
            }
            &.published {
              color: #52c41a;
              &:hover {
                color: #73d13d;
              }
            }
          }

          &.toggle-icon.active {
            color: #52c41a;
          }
        }
      }

      .empty-indicators {
        color: #868993;
      }
    }
  }

  /* Mobile adaptation */
  @media (max-width: 768px) {
    .chart-header {
      background: #1e222d;
      border-bottom-color: #2a2e39;

      .current-symbol {
        border-top-color: #2a2e39;
      }
    }

    .chart-left {
      border-bottom-color: #2a2e39;
    }

    .chart-right {
      border-top-color: #2a2e39;
      max-height: 500px !important;
      .indicators-panel {
        .panel-header {
          background: #1e222d;
          border-bottom-color: #2a2e39;
        }

        .mobile-indicator-tabs {
          :deep(.ant-tabs-bar) {
            border-bottom-color: #2a2e39;
          }

          :deep(.ant-tabs-tab) {
            color: #868993;
          }

          :deep(.ant-tabs-tab-active) {
            color: #1890ff;
          }

          :deep(.ant-tabs-ink-bar) {
            background-color: #1890ff;
          }

          .mobile-create-btn-wrapper {
            background: #1e222d;
          }
        }
      }
    }

    .mobile-symbol-price {
      background: #1e222d;
      border-bottom-color: #2a2e39;

      .mobile-symbol-label {
        margin-left: 5px;
        color: #d1d4dc;
      }

      .mobile-market-tag {
        color: #868993;
        background: #2a3932;
      }

      .mobile-price-info {
        &.color-up {
          color: #0ecb81;
        }

        &.color-down {
          color: #f6465d;
        }
      }
    }
  }
}

/* Add stock modal styles */
.add-stock-modal-content {
  .market-tabs {
    margin-bottom: 16px;
  }

  .symbol-search-section {
    margin-bottom: 24px;
  }

  .search-results-section,
  .hot-symbols-section {
    margin-bottom: 24px;

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }
  }

  .symbol-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #e8e8e8;
    border-radius: 4px;

    .symbol-list-item {
      cursor: pointer;
      padding: 8px 12px;
      transition: background-color 0.3s;

      &:hover {
        background-color: #f5f5f5;
      }

      .symbol-item-content {
        display: flex;
        align-items: center;
        gap: 8px;

        .symbol-code {
          font-weight: 600;
          color: #262626;
          min-width: 80px;
        }

        .symbol-name {
          color: #595959;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }

  .selected-symbol-section {
    margin-top: 16px;

    .selected-symbol-info {
      display: flex;
      align-items: center;
    }
  }

}

/* Dark theme modal styles */
.chart-container.theme-dark,
:global(body.dark) .chart-container,
:global(body.realdark) .chart-container {
  .add-stock-modal-content {
    .search-results-section,
    .hot-symbols-section {
      .section-title {
        color: #d1d4dc;
      }
    }

    .symbol-list {
      border-color: #363c4e;
      background-color: #2a2e39;

      .symbol-list-item {
        &:hover {
          background-color: #363c4e;
        }

        .symbol-item-content {
          .symbol-code {
            color: #d1d4dc;
          }

          .symbol-name {
            color: #868993;
          }
        }
      }
    }
  }
}

/* Indicator parameter configuration modal */
.params-config-modal {
  .indicator-info {
    text-align: center;
    margin-bottom: 8px;

    .indicator-name {
      font-size: 16px;
      font-weight: 600;
      color: #1f1f1f;
    }
  }

  .params-form {
    .param-item {
      margin-bottom: 16px;

      .param-header {
        display: flex;
        align-items: center;
        margin-bottom: 6px;

        .param-label {
          font-weight: 500;
          color: #333;
        }
      }
    }
  }
}

.theme-dark .params-config-modal {
  .indicator-info .indicator-name {
    color: #e0e0e0;
  }

  .params-form .param-item .param-header .param-label {
    color: #d0d0d0;
  }
}
</style>
